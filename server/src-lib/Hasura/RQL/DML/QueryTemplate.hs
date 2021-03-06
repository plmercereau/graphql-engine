module Hasura.RQL.DML.QueryTemplate
  ( ExecQueryTemplate(..)
  , runExecQueryTemplate
  ) where

import           Hasura.Prelude
import           Hasura.RQL.DDL.QueryTemplate
import           Hasura.RQL.DML.Internal
import           Hasura.RQL.DML.Returning     (encodeJSONVector)
import           Hasura.RQL.GBoolExp          (txtRHSBuilder)
import           Hasura.RQL.Instances         ()
import           Hasura.RQL.Types
import           Hasura.SQL.Types

import qualified Database.PG.Query            as Q
import qualified Hasura.RQL.DML.Count         as RC
import qualified Hasura.RQL.DML.Delete        as R
import qualified Hasura.RQL.DML.Insert        as R
import qualified Hasura.RQL.DML.Select        as R
import qualified Hasura.RQL.DML.Update        as R
import qualified Hasura.SQL.DML               as S

import           Data.Aeson.Casing
import           Data.Aeson.TH
import           Data.Aeson.Types
import           Instances.TH.Lift            ()
import           Language.Haskell.TH.Syntax   (Lift)

import qualified Data.ByteString.Builder      as BB
import qualified Data.HashMap.Strict          as M
import qualified Data.Sequence                as DS
import qualified Data.Vector                  as V

type TemplateArgs = M.HashMap TemplateParam Value

data ExecQueryTemplate
  = ExecQueryTemplate
  { eqtName :: !TQueryName
  , eqtArgs :: !TemplateArgs
  } deriving (Show, Eq, Lift)

$(deriveJSON (aesonDrop 3 snakeCase){omitNothingFields=True} ''ExecQueryTemplate)

getParamValue
  :: TemplateArgs
  -> TemplateParamConf
  -> DMLP1 Value
getParamValue params (TemplateParamConf paramName paramVal) =
  maybe paramMissing return $ M.lookup paramName params <|> paramVal
  where
    paramMissing = throw400 InvalidParams $
      "missing parameter : " <>> paramName

data QueryTProc
  = QTPInsert !(R.InsertQueryP1, DS.Seq Q.PrepArg)
  | QTPSelect !(R.AnnSel, DS.Seq Q.PrepArg)
  | QTPUpdate !(R.UpdateQueryP1, DS.Seq Q.PrepArg)
  | QTPDelete !(R.DeleteQueryP1, DS.Seq Q.PrepArg)
  | QTPCount !(RC.CountQueryP1, DS.Seq Q.PrepArg)
  | QTPBulk ![QueryTProc]
  deriving (Show, Eq)

buildPrepArg
  :: TemplateArgs
  -> PGColType
  -> Value
  -> DMLP1 S.SQLExp
buildPrepArg args pct val =
  case val of
    Object _ -> do
      tpc <- decodeValue val
      v <- getParamValue args tpc
      modifyErr (withParamErrMsg tpc) $ binRHSBuilder pct v
    _ -> txtRHSBuilder pct val
  where
    withParamErrMsg tpc t =
      "when processing parameter " <> tpcParam tpc  <<> " : " <> t

decodeIntValue :: TemplateArgs -> Value -> DMLP1 Int
decodeIntValue args val =
  case val of
   Object _ -> do
     tpc <- decodeValue val
     v <- getParamValue args tpc
     decodeValue v
   _        -> decodeValue val

mkSelQWithArgs :: SelectQueryT -> TemplateArgs -> DMLP1 SelectQuery
mkSelQWithArgs (DMLQuery tn (SelectG c w o lim offset)) args = do
  intLim <- mapM (decodeIntValue args) lim
  intOffset <- mapM (decodeIntValue args) offset
  return $ DMLQuery tn $ SelectG c w o intLim intOffset

convQT
  :: (UserInfoM m, QErrM m, CacheRM m)
  => TemplateArgs
  -> QueryT
  -> m QueryTProc
convQT args qt = case qt of
  QTInsert q -> fmap QTPInsert $ liftDMLP1 $
                R.convInsertQuery decodeParam binRHSBuilder q
  QTSelect q -> fmap QTPSelect $ liftDMLP1 $
                mkSelQWithArgs q args >>= R.convSelectQuery f
  QTUpdate q -> fmap QTPUpdate $ liftDMLP1 $ R.validateUpdateQueryWith f q
  QTDelete q -> fmap QTPDelete $ liftDMLP1 $ R.validateDeleteQWith f q
  QTCount q  -> fmap QTPCount $ liftDMLP1 $ RC.validateCountQWith f q
  QTBulk q   -> fmap QTPBulk $ mapM (convQT args) q
  where
    decodeParam val = do
      tpc <- decodeValue val
      v <- getParamValue args tpc
      R.decodeInsObjs v

    f = buildPrepArg args

execQueryTemplateP1
  :: (UserInfoM m, QErrM m, CacheRM m)
  => ExecQueryTemplate -> m QueryTProc
execQueryTemplateP1 (ExecQueryTemplate qtn args) = do
  (QueryTemplateInfo _ qt) <- askQTemplateInfo qtn
  convQT args qt

execQueryTP2 :: (QErrM m, CacheRM m, MonadTx m) => QueryTProc -> m RespBody
execQueryTP2 qtProc = case qtProc of
  QTPInsert qp -> liftTx $ R.insertP2 qp
  QTPSelect qp -> liftTx $ R.selectP2 False qp
  QTPUpdate qp -> liftTx $ R.updateQueryToTx qp
  QTPDelete qp -> liftTx $ R.deleteQueryToTx qp
  QTPCount qp  -> RC.countQToTx qp
  QTPBulk qps  -> do
    respList <- mapM execQueryTP2 qps
    let bsVector = V.fromList respList
    return $ BB.toLazyByteString $ encodeJSONVector BB.lazyByteString bsVector

runExecQueryTemplate
  :: (QErrM m, UserInfoM m, CacheRM m, MonadTx m)
  => ExecQueryTemplate -> m RespBody
runExecQueryTemplate q =
  execQueryTemplateP1 q >>= execQueryTP2

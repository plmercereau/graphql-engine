import {
  baseUrl,
  getTableName,
  getColName,
  getElementFromAlias,
} from '../../../helpers/dataHelpers';

import {
  setMetaData,
  validateCT,
  validateColumn,
} from '../../validators/validators';

const testName = 'mod';

export const passMTCreateTable = () => {
  cy.get(getElementFromAlias('data-create-table')).click();
  cy.url().should('eq', `${baseUrl}/data/schema/public/table/add`);
  cy.get(getElementFromAlias('tableName')).type(getTableName(0, testName));
  cy.get(getElementFromAlias('column-0')).type('id');
  cy.get(getElementFromAlias('col-type-0')).select('Integer');
  cy.get(getElementFromAlias('primary-key-select-0')).select('id');
  cy.get(getElementFromAlias('table-create')).click();
  cy.wait(7000);
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/tables/${getTableName(0, testName)}/modify`
  );

  validateCT(getTableName(0, testName), 'success');
};

export const passMTCheckRoute = () => {
  // Click on the create table button
  cy.get(getElementFromAlias('table-modify')).click();
  // Match the URL
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/tables/${getTableName(0, testName)}/modify`
  );
};

export const passMTMoveToTable = () => {
  cy.get(getElementFromAlias(getTableName(0, testName))).click();
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/tables/${getTableName(0, testName)}/browse`
  );
};

export const failMTWithoutColName = () => {
  cy.get(getElementFromAlias('add-column-button')).click();
  // cy.get('.notification-error').click();
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/tables/${getTableName(0, testName)}/modify`
  );

  validateColumn(getTableName(0, testName), [getColName(2)], 'failure');
};

export const failMTWithoutColType = () => {
  cy.get(getElementFromAlias('column-name')).type(getColName(2));
  cy.get(getElementFromAlias('add-column-button')).click();
  // cy.get('.notification-error').click();
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/tables/${getTableName(0, testName)}/modify`
  );
  validateColumn(getTableName(0, testName), [getColName(2)], 'failure');
};

export const Addcolumnnullable = () => {
  cy.get(getElementFromAlias('column-name')).type('{selectall}{del}');
  cy.get(getElementFromAlias('column-name')).type(getColName(3));
  cy.get(getElementFromAlias('data-type')).select('Text');
  cy.get(getElementFromAlias('nullable-checkbox')).uncheck({ force: true });
  cy.get(getElementFromAlias('add-column-button')).click();
  cy.wait(2500);
  // cy.get('.notification-error').click();
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/tables/${getTableName(0, testName)}/modify`
  );
  validateColumn(getTableName(0, testName), [getColName(3)], 'failure');
};

export const Addcolumnname = name => {
  cy.get(getElementFromAlias('column-name')).type('{selectall}{del}');
  cy.get(getElementFromAlias('column-name')).type(name);
  cy.get(getElementFromAlias('data-type')).select('integer');

  cy.get(getElementFromAlias('add-column-button')).click();
  cy.wait(5000);
  validateColumn(getTableName(0, testName), [name], 'success');
};

export const passMTAddColumn = () => {
  cy.get(getElementFromAlias('column-name')).type('{selectall}{del}');
  cy.get(getElementFromAlias('column-name')).type(getColName(0));
  cy.get(getElementFromAlias('data-type')).select('integer');
  cy.get(getElementFromAlias('add-column-button')).click();
  cy.wait(5000);
  // cy.get('.notification-success').click();
  validateColumn(getTableName(0, testName), [getColName(0)], 'success');
};

export const Movetocolumn = () => {
  Addcolumnname(getColName(1));
  cy.get(getElementFromAlias(`edit-${getColName(1)}`)).click();
};

export const failMCWithWrongDefaultValue = () => {
  cy.get(getElementFromAlias(`edit-${getColName(0)}`)).click();
  cy.get(getElementFromAlias('edit-col-default')).type('abcd');
  cy.get(getElementFromAlias('save-button')).click();
};

export const passMCWithRightDefaultValue = () => {
  cy.get(getElementFromAlias('edit-col-default'))
    .clear()
    .type('1234');
  cy.get(getElementFromAlias('save-button')).click();
  cy.wait(15000);
};

export const passCreateForeignKey = () => {
  cy.get(getElementFromAlias('edit-col-unique')).select('True');
  cy.get(getElementFromAlias('foreign-key-checkbox')).check();
  cy.get(getElementFromAlias('ref-table')).select(getTableName(0, testName));
  cy.get(getElementFromAlias('ref-col')).select(getColName(0));
  cy.get(getElementFromAlias('save-button')).click();
  cy.wait(15000);
};

export const passRemoveForeignKey = () => {
  cy.get(getElementFromAlias('remove-constraint-button')).click();
  cy.wait(10000);
};

export const passMTDeleteCol = () => {
  // cy.get(getElementFromAlias(`edit-${getColName(0)}`)).click();
  // cy.wait(500);
  cy.get(getElementFromAlias('remove-button')).click();
  cy.on('window:alert', str => {
    expect(str === 'Are you sure you want to delete?').to.be.true;
  });
  cy.wait(5000);
  // cy.get('.notification-success').click();
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/tables/${getTableName(0, testName)}/modify`
  );
  validateColumn(getTableName(0, testName), [getColName(0)], 'failure');
};

export const passMTDeleteTableCancel = () => {
  cy.get(getElementFromAlias('delete-table')).click();
  cy.on('window:confirm', () => false);
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/tables/${getTableName(0, testName)}/modify`
  );

  validateCT(getTableName(0, testName), 'success');
};

export const passMTDeleteTable = () => {
  cy.get(getElementFromAlias('delete-table')).click();
  cy.on('window:confirm', () => true);
  cy.wait(5000);
  cy.url().should('eq', `${baseUrl}/data/schema/public`);
  validateCT(getTableName(0, testName), 'failure');
};

export const setValidationMetaData = () => {
  setMetaData();
};

//  Views Modify /////////////////////////////////////////////////

export const Createtable = (name, dict) => {
  cy.url().should('eq', `${baseUrl}/data/schema/public/table/add`);
  cy.get(getElementFromAlias('tableName')).type(`${name}_table_mod`);
  const keys = Object.keys(dict).map(k => k);
  const values = Object.keys(dict).map(k => dict[k]);
  for (let i = 0; i < keys.length; i += 1) {
    cy.get('input[placeholder="column_name"]')
      .last()
      .type(keys[i]);
    cy.get('select')
      .find('option')
      .contains('-- type --')
      .parent()
      .last()
      .select(values[i]);
  }

  cy.get('select')
    .last()
    .select('id');
  cy.get(getElementFromAlias('table-create')).click();
  cy.wait(7000);
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/tables/${name}_table_mod/modify`
  );

  validateCT(`${name}_table_mod`, 'success');
};

export const Createtables = () => {
  cy.get(getElementFromAlias('data-create-table')).click();
  Createtable('author', { id: 'Integer', name: 'Text' });
  cy.get(getElementFromAlias('sidebar-add-table')).click();
  Createtable('article', {
    id: 'Integer',
    title: 'Text',
    Content: 'Text',
    author_id: 'Integer',
    rating: 'Integer',
  });
};

export const Createview = () => {
  cy.get(getElementFromAlias('sql-link')).click();
  cy.get('textarea').type(`CREATE VIEW author_average_rating_mod AS
    SELECT author_table_mod.id, avg(article_table.rating)
    From author_table_mod, article_table_mod
    WHERE author_table_mod.id = article_table_mod.author_id
    GROUP BY author_table_mod.id`);
  cy.get(getElementFromAlias('run-sql')).click();
  validateCT('author_average_rating_mod', 'success');
};

export const Checkviewtable = () => {
  cy.get(getElementFromAlias('author_average_rating_mod')).click();
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/views/author_average_rating_mod/browse`
  );
  cy.get(getElementFromAlias('table-modify')).click();
  cy.get(getElementFromAlias('modify-view')).click();
  cy.url().should('eq', `${baseUrl}/data/sql`);
};

export const Checkviewtabledelete = () => {
  cy.get(getElementFromAlias('author_average_rating_mod')).click();
  cy.url().should(
    'eq',
    `${baseUrl}/data/schema/public/views/author_average_rating_mod/browse`
  );
  cy.get(getElementFromAlias('table-modify')).click();
  cy.get(getElementFromAlias('delete-view')).click();
  cy.on('window:confirm', str => {
    expect(str === 'Are you sure?').to.be.true;
    return true;
  });

  cy.wait(7000);
  validateCT('author_average_rating_mod', 'failure');
};

export const Issue = () => {
  cy.get('.ace_text-input')
    .first()
    .type('#include');
};

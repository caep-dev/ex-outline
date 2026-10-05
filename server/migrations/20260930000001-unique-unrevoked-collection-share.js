"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "shares_collection_unrevoked_unique"
      ON "shares" ("collectionId")
      WHERE "collectionId" IS NOT NULL AND "revokedAt" IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "shares_collection_unrevoked_unique"
    `);
  },
};

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "website_integrations",
        {
          key: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            unique: true,
            references: { model: "teams", key: "id" },
            onDelete: "RESTRICT",
          },
          issuer: { type: Sequelize.STRING, allowNull: false },
          initialAdminSubject: { type: Sequelize.UUID, allowNull: false },
          createdAt: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction }
      );
      await queryInterface.createTable(
        "external_identities",
        {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: Sequelize.UUIDV4,
          },
          issuer: { type: Sequelize.STRING, allowNull: false },
          subject: { type: Sequelize.UUID, allowNull: false },
          userId: {
            type: Sequelize.UUID,
            allowNull: false,
            unique: true,
            references: { model: "users", key: "id" },
            onDelete: "RESTRICT",
          },
          profileVersion: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction }
      );
      await queryInterface.addIndex(
        "external_identities",
        ["issuer", "subject"],
        {
          unique: true,
          name: "external_identities_issuer_subject_unique",
          transaction,
        }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "external_identities"
        ADD CONSTRAINT "external_identities_profile_version_check" CHECK ("profileVersion" >= 0)`,
        { transaction }
      );
      await queryInterface.createTable(
        "external_sessions",
        {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: Sequelize.UUIDV4,
          },
          userId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "RESTRICT",
          },
          websiteSessionId: { type: Sequelize.UUID, allowNull: false },
          hydraSid: { type: Sequelize.STRING, allowNull: false },
          clientId: { type: Sequelize.STRING, allowNull: false },
          expiresAt: { type: Sequelize.DATE, allowNull: false },
          revokedAt: { type: Sequelize.DATE, allowNull: true },
          encryptedAccessToken: { type: Sequelize.TEXT, allowNull: true },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction }
      );
      await queryInterface.addIndex(
        "external_sessions",
        ["websiteSessionId", "revokedAt"],
        { transaction }
      );
      await queryInterface.addIndex(
        "external_sessions",
        ["userId", "revokedAt"],
        { transaction }
      );
      await queryInterface.addIndex(
        "external_sessions",
        ["clientId", "hydraSid"],
        { transaction }
      );
      await queryInterface.createTable(
        "external_revocation_events",
        {
          eventId: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
          createdAt: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction }
      );
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("external_revocation_events", {
        transaction,
      });
      await queryInterface.dropTable("external_sessions", { transaction });
      await queryInterface.dropTable("external_identities", { transaction });
      await queryInterface.dropTable("website_integrations", { transaction });
    });
  },
};

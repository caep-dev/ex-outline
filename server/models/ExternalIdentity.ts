import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "sequelize-typescript";
import Model from "@server/models/base/Model";
import User from "./User";

@Table({ tableName: "external_identities", modelName: "external_identity" })
class ExternalIdentity extends Model<
  InferAttributes<ExternalIdentity>,
  Partial<InferCreationAttributes<ExternalIdentity>>
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column(DataType.STRING)
  issuer: string;

  @Column(DataType.UUID)
  subject: string;

  @Unique
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @Default(0)
  @Column(DataType.INTEGER)
  profileVersion: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ExternalIdentity;

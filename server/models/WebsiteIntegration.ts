import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";
import Model from "@server/models/base/Model";
import Team from "./Team";

@Table({
  tableName: "website_integrations",
  modelName: "website_integration",
  updatedAt: false,
})
class WebsiteIntegration extends Model<
  InferAttributes<WebsiteIntegration>,
  Partial<InferCreationAttributes<WebsiteIntegration>>
> {
  @PrimaryKey
  @Column(DataType.STRING)
  key: string;

  @Unique
  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @Column(DataType.STRING)
  issuer: string;

  @Column(DataType.UUID)
  initialAdminSubject: string;

  @CreatedAt
  createdAt: Date;
}

export default WebsiteIntegration;

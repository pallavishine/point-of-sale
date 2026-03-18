import mongoose from "mongoose";

const billingSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    trialPeriod: { type: Boolean },
    interval: { type: String, required: true },
    price: { type: String, required: true },
    plan: { type: String, required: true },
    charge_id: String,
    activated_on: String,
    billing_on: String,
  },
  {
    timestamps: true,
  },
);

const sessionSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    accessToken: { type: String, required: true },
    scope: String,
  },
  {
    timestamps: true,
  },
);

const merchantSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    email: String,
    shopOwnerName: String,
    ianaTimezone: String,
    currencyCode: String,
    rating_star: Number,
    rating: Boolean,
    feedback: String,
    rating_modal_cancelled: Date,
  },
  {
    timestamps: true,
  },
);

const fieldSchema = new mongoose.Schema(
  {
    id: String,
    type: String,
    source: String,
    label: String,
    enabled: Boolean,
    order: Number,
    icon: String,
    default: String,
    format: String,
    settings: Object,
  },
  { _id: false },
);

const lineSchema = new mongoose.Schema(
  {
    id: String,
    label: String,
    enabled: Boolean,
    type: String,
    maxFieldSelected: Number,
    order: Number,
    settings: Object,
    fields: [fieldSchema],
  },
  { _id: false },
);

const templateSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    templateName: { type: String, required: true },
    description: String,
    status: {
      type: String,
      enum: ["active", "draft"],
      default: "draft",
    },
    paperBrand: String,
    paperModel: String,
    dimension: { type: Object, default: {} },
    settings: Object,
    lines: [lineSchema],
    advancedElements: [
      {
        id: String,
        type: String,
        content: String,
        enabled: Boolean,
        position: Object,
        settings: mongoose.Schema.Types.Mixed,
        dataSource: String,
        format: String,
      },
    ],
    lastUsed: Date,
  },
  {
    timestamps: true,
  },
);
const printJobSchema = new mongoose.Schema(
  {
    shop: {
      type: String,
      required: true,
      index: true,
    },

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LabelTemplate",
      required: true,
    },

    variantIds: [
      {
        type: String,
        required: true,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);
const settingSchema = new mongoose.Schema(
  {
    shop: {
      type: String,
      required: true,
      index: true,
    },
    fields: {
      type: Array,
      default:[],
    },
    discounts: {
      type: Object,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

// Compound index for shop + template templateName uniqueness
templateSchema.index({ shop: 1, templateName: 1 }, { unique: true });

const billingModel =
  mongoose.models?.billings || mongoose.model("billings", billingSchema);
const sessionModel =
  mongoose.models?.credential || mongoose.model("credential", sessionSchema);
const merchantInfoModel =
  mongoose.models?.merchantinfo ||
  mongoose.model("merchantinfo", merchantSchema);
const templateModel =
  mongoose.models?.templates || mongoose.model("templates", templateSchema);
const printJobModel =
  mongoose.models?.PrintJob || mongoose.model("PrintJob", printJobSchema);
const settingsModel =
  mongoose.models?.settings || mongoose.model("settings", settingSchema);

export {
  sessionModel,
  billingModel,
  merchantInfoModel,
  templateModel,
  printJobModel,
  settingsModel,
};

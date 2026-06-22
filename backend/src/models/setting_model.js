import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    base_currency: {
      type: String,
      required: true,
      default: "PHP",
    },
    active_markup: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// We only need one global setting document. 
// We can enforce this or just always update the first one.
export default mongoose.model("Setting", settingSchema);

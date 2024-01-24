const { Schema, model } = require("mongoose");

const handleMongooseError = require("../../helpers/handleMongooseError");

const waterSchema = new Schema(
  {
    waterRate: { type: Number, required: [true, "waterRate is required"] },
    waterVolume: { type: Number, required: [true, "waterVolume is required"] },
    date: { type: Number, required: [true, "date is required"] },
  },
  { versionKey: false, timestamps: false }
);

waterSchema.post("save", handleMongooseError);

const Water = model("water", waterSchema);

module.exports = Water;

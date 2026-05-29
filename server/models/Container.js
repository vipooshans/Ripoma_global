const mongoose = require('mongoose');

const ContainerHistorySchema = new mongoose.Schema({
  shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
  from: { type: String },
  to: { type: String },
  startDate: { type: Date },
  endDate: { type: Date }
}, { _id: false });

const ContainerSchema = new mongoose.Schema(
  {
    containerNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['20GP', '40GP', '40HC', '20RF', '40RF', '20OT', '40OT', '20FR', '40FR', 'LCL', 'other'],
      required: true
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'in_transit', 'at_port', 'unloading', 'returned', 'damaged'],
      default: 'available'
    },
    owner: { type: String },
    currentShipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', default: null },
    currentLocation: { type: String },
    sealNumber: { type: String },
    tare: { type: Number }, // weight in kg
    maxPayload: { type: Number }, // max payload weight in kg
    currentPayload: { type: Number, default: 0 },
    notes: { type: String },
    history: [ContainerHistorySchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Container', ContainerSchema);

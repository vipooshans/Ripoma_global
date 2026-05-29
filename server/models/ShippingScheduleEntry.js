const mongoose = require('mongoose');

const ShippingScheduleEntrySchema = new mongoose.Schema(
  {
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
    title: { type: String, required: true },
    eventType: { 
      type: String, 
      enum: ['departure', 'arrival', 'customs', 'delivery', 'transit'], 
      required: true 
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['scheduled', 'completed', 'delayed', 'cancelled'], 
      default: 'scheduled' 
    },
    notes: { type: String }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ShippingScheduleEntry', ShippingScheduleEntrySchema);

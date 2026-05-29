const mongoose = require('mongoose');

const TrackingEventSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  location: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['scheduled', 'in_transit', 'at_port', 'customs', 'out_for_delivery', 'delivered', 'delayed', 'exception'],
    required: true
  },
  source: { type: String, enum: ['api', 'manual'], default: 'manual' },
  latitude: { type: Number },
  longitude: { type: Number }
}, { _id: false });

const ShipmentSchema = new mongoose.Schema(
  {
    shipmentNumber: { type: String, unique: true }, // SHP-YYYY-XXXXX
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    
    // Poly references
    importOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportOrder', default: null },
    exportOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportOrder', default: null },
    goodsReceipt: { type: mongoose.Schema.Types.ObjectId, ref: 'GoodsReceipt', default: null },
    dispatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch', default: null },
    
    containers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Container' }],
    
    carrierName: { type: String, required: true }, // e.g. DHL, FedEx, Maersk, Manual
    carrierCode: { type: String, required: true, uppercase: true }, // DHL, FEDEX, MAERSK, MANUAL
    trackingNumber: { type: String, required: true },
    
    mbl: { type: String }, // Master Bill of Lading
    hbl: { type: String }, // House Bill of Lading
    vesselName: { type: String },
    voyageNumber: { type: String },
    flightNumber: { type: String },
    
    shippingMethod: { type: String, enum: ['sea', 'air', 'road', 'rail', 'courier'], required: true },
    status: {
      type: String,
      enum: ['scheduled', 'in_transit', 'at_port', 'customs', 'out_for_delivery', 'delivered', 'exception'],
      default: 'scheduled'
    },
    
    origin: {
      name: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    destination: {
      name: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    currentLocation: {
      name: { type: String },
      latitude: { type: Number },
      longitude: { type: Number }
    },
    
    departureDate: { type: Date },
    estimatedArrivalDate: { type: Date },
    actualArrivalDate: { type: Date },
    originalEstimatedArrivalDate: { type: Date },
    
    isDelayed: { type: Boolean, default: false },
    delayDays: { type: Number, default: 0 },
    delayReason: { type: String },
    
    trackingEvents: [TrackingEventSchema],
    
    notes: { type: String },
    documents: [
      {
        name: { type: String },
        type: { type: String, enum: ['bill_of_lading', 'airway_bill', 'packing_list', 'commercial_invoice', 'customs_clearance', 'delivery_receipt', 'other'] },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Shipment', ShipmentSchema);

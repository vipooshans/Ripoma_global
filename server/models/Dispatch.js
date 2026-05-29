const mongoose = require('mongoose');

const DispatchItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantityDispatched: { type: Number, required: true }
});

const DispatchSchema = new mongoose.Schema(
  {
    dispatchNumber: { type: String, unique: true }, // DSP-[YEAR]-[5-digit]
    exportOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportOrder', required: true },
    status: {
      type: String,
      enum: ['pending', 'handed_to_carrier', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
      default: 'pending'
    },

    carrier: { type: String }, // e.g. DHL, FedEx, Maersk
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    shippingMethod: { type: String, enum: ['sea', 'air', 'road', 'rail', 'courier'] },

    items: [DispatchItemSchema],

    dispatchDate: { type: Date },
    estimatedArrival: { type: Date },
    actualArrival: { type: Date },

    originAddress: {
      street: { type: String },
      city: { type: String },
      country: { type: String }
    },
    destinationAddress: {
      street: { type: String },
      city: { type: String },
      country: { type: String }
    },

    weight: { type: Number }, // kg
    volume: { type: Number }, // cubic metres
    numberOfPackages: { type: Number },

    notes: { type: String },
    documents: [
      {
        name: { type: String },
        url: { type: String }
      }
    ],

    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Dispatch', DispatchSchema);

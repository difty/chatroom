'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const UserSchema = new Schema({
    name: {
      type: String,
      required: true,
    },
    __v: { type: Number, select: false },
  });
  return mongoose.model('User', UserSchema);
};

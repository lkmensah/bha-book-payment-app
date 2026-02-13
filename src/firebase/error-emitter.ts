import { EventEmitter } from 'events';

// This is a global event emitter for Firebase errors.
// We use this to propagate errors from the data layer to the UI layer
// without having to thread props or contexts through every component.
export const errorEmitter = new EventEmitter();

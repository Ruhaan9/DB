// source/typingContext.js
// A simple module-level flag that any screen can set to true while a
// TextInput is active. app.js reads it before handling tab-switch keys.
let _typing = false;

export const setTyping = (v) => { _typing = v; };
export const isTyping  = ()  => _typing;
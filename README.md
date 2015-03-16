
Introduction

_Based on clippings from http://prosody.im/chat_

The idea of the project was to make a library to easily connect to XMPP chatrooms from any web page. You just pass it elements to serve as the message log, input box, user list, etc.


*Specific files*

index.html -Just a sample frontend. Try it on for size, then redo it all in your own style :)

muc_ui.js - Here the user /may/ want to customise in order to add Javascript code unique to a particular interface (they could use jQuery there for example). There's little or no XMPP stuff in this file.

muc_handler.js - is where all the XMPP stuff hides, and is the core part of the project that the end user shouldn't need to edit.

# Authenticated JSON API

Only users who pass a valid Firebase ID token as a Bearer token in the
`Authorization` header of the HTTP request are authorized to use the API.

## Setting up

 1. Create a Firebase Project using the [Firebase Console](https://console.firebase.google.com).
 1. Enable the **Google** Provider in the **Auth** section.
 1. You must have the Firebase CLI installed. If you don't have it install it with `npm install -g firebase-tools` and then configure it with `firebase login`.
 1. Configure the CLI locally by using `firebase use --add` and select your project in the list.
 1. Install dependencies locally by running: `cd functions; npm install; cd -`

## Deploy and test
To test locally do:

  1. Start serving your project locally using `firebase serve --functions`

To deploy and test on prod do:

 1. Deploy your project using `firebase deploy`
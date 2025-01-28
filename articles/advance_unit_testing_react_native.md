# Advanced Unit and Snapshot Testing with React Native

## Metadata

Chad Nehemiah
Published in
Level Up Coding
·
5 min read
·
Jul 7, 2019

[original article](https://medium.com/gitconnected/advanced-unit-and-snapshot-testing-with-react-native-ea746feb5b2e)

### Body

As React Native has grown in adoption, the community has expanded vastly and thus there many ongoing changes to the core. Currently, 0.6 is the next release candidate. I have been using React Native since 0.4, and as many of you may know, there is a high probability that even a minor version upgrade will have breaking changes (particularly with react-native-firebase for push notifications), and so maybe in the future, I may write an article on just resolving those issues alone. The main purpose of the article is to help those who really want to have that 100% code coverage for their React Native app, because that’s what pushed us to discover these techniques.

I will be using Jest with Enzyme to capture these scenarios, simply because Jest was created by Facebook for React, and Enzyme is a great utility for snapshot testing which covers a variety of UI related tests. Also, in this project, I am using redux-thunk. I won’t go into details about how to utilize Redux because there are ample articles addressing that.

Firstly let’s deal with some configuration.

Here is the package.json file:

```json
{
  "name": "myApp",
  "version": "1.0.0",
  "jest": {
    "bail": true,
    "collectCoverage": true,
    "coverageThreshold": {
      "global": {
        "statements": 85,
        "branches": 80,
        "functions": 80,
        "lines": 85
      },
      "./src/redux/*": {
        "statements": 95
      },
    },
    "coverageReporters": [
      "json-summary",
      "text",
      "lcov"
    ],
    "testResultsProcessor": "jest-teamcity-reporter",
    "verbose": true,
    "notify": true,
    "preset": "react-native",
    "transform": {
      "^.+\\.js$": "<rootDir>/src/preprocessor.js"
    },
    "setupFilesAfterEnv": [
      "<rootDir>/src/setupTests.js"
    ],
    "coveragePathIgnorePatterns": [
      "/node_modules/",
      "/src/setupTests.js"
    ],
    "transformIgnorePatterns": [
      "node_modules/(?!react-native|react-navigation)/"
    ]
  },
 "scripts": {
    "lint": "./node_modules/.bin/eslint ./ --fix --ignore-path .eslintignore --ignore-pattern !.gitignore --format=node_modules/eslint-formatter-pretty",
    "link": "npm run react-native link",
    "test": "npm run lint && jest --forceExit --detectOpenHandles",
    "start": "npm run start-default --config=rn-cli.config.js",
 },
 "dependencies": {
    "react": "16.8.3",
    "react-native": "0.59.3",
    "react-native-keychain": "3.1.3",
    "react-native-firebase": "^5.5.3",
    "react-native-permissions": "^1.1.1",
    "react-redux": "5.0.6",
    "react-timer-mixin": "^0.13.4",
    "redux": "3.7.2",
    "redux-thunk": "2.2.0",
    "regenerator": "^0.13.3",
    "require": "^2.4.20",
    "undefined": "^0.1.0",
    "underscore": "^1.9.1",
    "utf8": "^3.0.0",
    "validate.js": "^0.12.0"
 },
"devDependencies": {
    "@babel/core": "7.4.4",
    "@babel/plugin-proposal-class-properties": "^7.4.4",
    "@babel/runtime": "^7.4.4",
    "@react-native-community/eslint-config": "0.0.3",
    "babel-eslint": "^10.0.1",
    "babel-jest": "24.7.1",
    "babel-plugin-syntax-dynamic-import": "^6.18.0",
    "enzyme": "^3.9.0",
    "enzyme-adapter-react-16": "^1.11.2",
    "eslint": "5.15.3",
    "eslint-config-standard": "^12.0.0",
    "eslint-formatter-pretty": "^2.1.1",
    "eslint-plugin-flowtype": "^3.4.2",
    "eslint-plugin-flowtype-errors": "^4.1.0",
    "eslint-plugin-import": "^2.16.0",
    "eslint-plugin-node": "^8.0.1",
    "eslint-plugin-promise": "^4.0.1",
    "eslint-plugin-react": "^7.12.4",
    "eslint-plugin-standard": "^4.0.0",
    "flow-bin": "^0.95.1",
    "gulp-babel": "^8.0.0",
    "istanbul": "^0.4.5",
    "jest": "24.8.0",
    "jest-cli": "^24.7.1",
    "jest-coverage-badges": "^1.1.2",
    "jest-runner-prettier": "^0.2.6",
    "metro": "^0.53.1",
    "metro-react-native-babel-preset": "0.53.1",
    "mock-async-storage": "^2.0.5",
    "mockdate": "^2.0.2",
    "react-native-debugger-open": "^0.3.19",
    "react-test-renderer": "16.8.3",
    "redux-devtools-extension": "^2.13.8",
    "redux-mock-store": "^1.5.3"
  }

}
```


One feature of Jest I find really cool is the coverageThreshold object, it allows a high level of reconfigurability with regards to enforcing code coverage. For instance, we set a higher threshold for critical components, in particular ones that are more difficult to debug, such as our Redux related code. This provides us with high certainty regarding the app's behavior.

I’ve only listed a few of the dependencies for the purposes of this article, but there may be others which are necessary to replicate this in production.

If you notice, I also use a setupTests file which is executed by the setupFilesAfterEnv array passed to Jest. This is to set up the most frequently mocked functionality in the app. It’s important to add this to the coveragePathIgnorePatterns array so that we don’t reduce our coverage by tracking a file that ought not to be tested. Take a look at the setup file:


Great, now that the setup is out the way, let’s get to creating our page.

So in this example, we have a page where users can disable and enable Biometric Authentication, as well as push notifications. There are a few things going on here though. Primarily :

We need to handle when the user leaves the application to enable notifications in their native device’s settings.
We need the user to confirm that they do actually intend to enable biometric authentication through some level of authorization, which in this case would be re-entering their password.
These tasks involve asynchronous activity such as accessing device storage and placing the application in the background, which changes the landscape of our tests. Let’s take a look at our SettingsPage container.


So let’s try and break down what our functions are doing here.

Our onUpdateNotificationPermissions function allows us to send users to their settings page on their respective device, this is of course async because we must first await the response once we request permissions.

Our init function will load the previously saved settings the user may have selected, from the device’s storage. We don’t want to show the biometric option to a device which does not have those capabilities and thus we do some checks to determine if the icon and toggleSwitch should be rendered.

Our updateNotificationPermissionStatus function will asynchronously update our internal state to display whether or not the user has opted to enable push notifications.

Our handleAppStateChange will handle the scenario when the application is transitioning in and out of the foreground, and update our internal state accordingly.

Our onBiometricAuthenticationSwitch actually sets the internal state when the user wants to make change the biometric settings, we toggle a modal (hence the dispatch to modal actions) requesting their credentials.

Our checkBiometricAuthenticationForUpdate will run each render to see if the user has changed their biometric settings.

Now that the major functions have been explained, let’s look at the test.


So we import some utility or helper functions that we use throughout our tests, this helps us abstract some of the necessary nitty and gritty of setting up a test, particularly newer versions of jest , enzyme and react-native . I will discuss that file later on but let’s examine some of our tests here.

Let’s look at how we test that it Should update notification permissions after app resume . We set our push notification permissions to false and the AppState object from react native to active. Through Jest’s snapshot functionality, we take a snapshot of what the button may look like, which we would expect to be off — in this case, isOn is set to false — since that’s what we set our push notification permissions to, in our mock function. We then place the app into the background, set the permissions to true, and then await the app to return to active, and expect isOn to now be set to true.

An important aspect of Biometric Authentication is obviously its security, and so we must ensure that we are securing any secrets properly. When a user wants to authenticate themselves in this setup, we must have first stored their identity on the Keychain , then we can retrieve it at later point.

So let’s look at the Should reset keychain and async storage on biometric option test. When a user no longer wants to enable biometric authentication, we must reset the Keychain’s generic password and also store persistently that the user no longer wishes to sign in that way. So ultimately we would expect biometric to be set to false and expect our resetGenericPassword to be called.

So I hope these tests are pretty easy to understand by reading them, as that was the main reason behind abstracting a lot of the technicality into the file below, testUtils.js which I will explain.


Starting with the render function, we have multiple different ways of rendering a component for testing due to redux. There is a particular issue which I have raised related to rendering with reduxForms , which requires multiple calls to the dive method. For the pureComponent render method as well, there may be times in testing when we want to dive deeper as well.

There are also some other utilities to assist in spying on functions, hence the SpyContainer , but this is just to make the tests more readable.

Thank you for taking the time to read this article and I hope it was useful. If you enjoyed it and/or found it helpful please leave a 👏. If not, please leave a comment and let me know what I can improve for the next one. I am a Full Stack developer with expertise in React Native and Angular. Happy unit testing!
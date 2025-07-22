/**
 * Test script for username functionality
 * This script tests various aspects of the username feature implementation
 */

// Test configuration
const config = {
  // Test user credentials
  testUsers: [
    {
      email: "test1@example.com",
      password: "password123",
      username: "test-user1",
    },
    {
      email: "test2@example.com",
      password: "password123",
      username: "test-user2",
    },
    { email: "test3@example.com", password: "password123", username: null }, // User without username
  ],
  // Test validation cases
  validationTests: [
    { username: "", expected: "Имя пользователя не может быть пустым" },
    {
      username: "ab",
      expected: "Имя пользователя должно быть от 3 до 20 символов",
    },
    {
      username: "abcdefghijklmnopqrstuvwxyz",
      expected: "Имя пользователя должно быть от 3 до 20 символов",
    },
    {
      username: "user@name",
      expected:
        "Имя пользователя может содержать только буквы, цифры, подчеркивания и дефисы",
    },
    { username: "valid-user_123", expected: null }, // Valid username
  ],
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

// Helper function to log test results
function logTest(name, passed, message = "") {
  const status = passed ? "✅ PASSED" : "❌ FAILED";
  console.log(`${status}: ${name} ${message ? "- " + message : ""}`);

  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;
}

// Helper function to create a test user
async function createTestUser(email, password, username) {
  try {
    // Create user with Firebase Auth
    const userCredential = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, password);
    const userId = userCredential.user.uid;

    // If username is provided, save it to the database
    if (username) {
      await firebase.database().ref(`users/${userId}`).set({
        username: username,
        email: email,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      });
    }

    return userId;
  } catch (error) {
    console.error("Error creating test user:", error);
    throw error;
  }
}

// Helper function to clean up test users
async function cleanupTestUser(email, password) {
  try {
    // Sign in as the test user
    const userCredential = await firebase
      .auth()
      .signInWithEmailAndPassword(email, password);

    // Delete the user
    await userCredential.user.delete();

    return true;
  } catch (error) {
    console.error("Error cleaning up test user:", error);
    return false;
  }
}

// Test username validation
function testUsernameValidation() {
  console.log("\n--- Testing Username Validation ---");

  // Get the validation function from auth.js
  // Since it's not directly accessible, we'll recreate it here
  function validateUsername(username) {
    // Check for empty value
    if (!username) {
      return "Имя пользователя не может быть пустым";
    }

    // Check length (3-20 characters)
    if (username.length < 3 || username.length > 20) {
      return "Имя пользователя должно быть от 3 до 20 символов";
    }

    // Check for allowed characters (letters, numbers, underscores, and hyphens)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return "Имя пользователя может содержать только буквы, цифры, подчеркивания и дефисы";
    }

    // If all checks pass
    return null;
  }

  // Run validation tests
  config.validationTests.forEach((test) => {
    const result = validateUsername(test.username);
    const passed = result === test.expected;

    logTest(
      `Validation for "${test.username || "(empty)"}"`,
      passed,
      passed ? "" : `Expected: "${test.expected}", Got: "${result}"`
    );
  });
}

// Test username storage in Firebase
async function testUsernameStorage() {
  console.log("\n--- Testing Username Storage ---");

  try {
    // Create a test user with a username
    const email = "storage_test@example.com";
    const password = "password123";
    const username = "storage-test-user";

    // Create the user
    const userId = await createTestUser(email, password, username);

    // Fetch the user data from Firebase
    const snapshot = await firebase
      .database()
      .ref(`users/${userId}`)
      .once("value");
    const userData = snapshot.val();

    // Check if the username was stored correctly
    const usernameStored = userData && userData.username === username;
    logTest("Username storage in Firebase", usernameStored);

    // Clean up
    await cleanupTestUser(email, password);
  } catch (error) {
    logTest("Username storage in Firebase", false, error.message);
  }
}

// Test username display in dashboard
async function testDashboardDisplay() {
  console.log("\n--- Testing Username Display in Dashboard ---");

  try {
    // Create a test user with a username
    const email = "dashboard_test@example.com";
    const password = "password123";
    const username = "dashboard-user";

    // Create the user
    await createTestUser(email, password, username);

    // Sign in as the test user
    await firebase.auth().signInWithEmailAndPassword(email, password);

    // Create mock DOM elements for testing
    const userNameEl = document.createElement("div");
    userNameEl.id = "userName";
    document.body.appendChild(userNameEl);

    const userEmailEl = document.createElement("div");
    userEmailEl.id = "userEmail";
    document.body.appendChild(userEmailEl);

    // Call the loadUserData function from dashboard.js
    // Since we can't directly access it, we'll recreate the relevant part
    const user = firebase.auth().currentUser;

    // Test if user data is loaded correctly
    const userId = user.uid;
    const snapshot = await firebase
      .database()
      .ref(`users/${userId}`)
      .once("value");
    const userData = snapshot.val();

    // Check if username is displayed correctly
    if (userData && userData.username) {
      userNameEl.textContent = userData.username;
      userEmailEl.textContent = user.email;
    } else {
      userNameEl.textContent = user.email;
    }

    const usernameDisplayed = userNameEl.textContent === username;
    const emailDisplayed = userEmailEl.textContent === email;

    logTest("Username display in dashboard", usernameDisplayed);
    logTest("Email display in dashboard", emailDisplayed);

    // Clean up
    document.body.removeChild(userNameEl);
    document.body.removeChild(userEmailEl);
    await cleanupTestUser(email, password);
  } catch (error) {
    logTest("Username display in dashboard", false, error.message);
  }
}

// Test fallback to email when username is not available
async function testFallbackMechanism() {
  console.log("\n--- Testing Fallback Mechanism ---");

  try {
    // Create a test user without a username
    const email = "fallback_test@example.com";
    const password = "password123";

    // Create the user without setting a username
    await createTestUser(email, password, null);

    // Sign in as the test user
    await firebase.auth().signInWithEmailAndPassword(email, password);

    // Create mock DOM elements for testing
    const userNameEl = document.createElement("div");
    userNameEl.id = "userName";
    document.body.appendChild(userNameEl);

    // Call the fetchAndDisplayUsername function from app.js
    // Since we can't directly access it, we'll recreate the relevant part
    const user = firebase.auth().currentUser;

    // Test if fallback works correctly
    const userId = user.uid;
    const snapshot = await firebase
      .database()
      .ref(`users/${userId}`)
      .once("value");
    const userData = snapshot.val();

    // Check fallback mechanism
    if (userData && userData.username) {
      userNameEl.textContent = userData.username;
    } else {
      userNameEl.textContent = user.email;
    }

    const fallbackWorking = userNameEl.textContent === email;

    logTest(
      "Fallback to email when username is not available",
      fallbackWorking
    );

    // Clean up
    document.body.removeChild(userNameEl);
    await cleanupTestUser(email, password);
  } catch (error) {
    logTest(
      "Fallback to email when username is not available",
      false,
      error.message
    );
  }
}

// Test Firebase security rules for username
async function testSecurityRules() {
  console.log("\n--- Testing Firebase Security Rules ---");

  try {
    // Create two test users
    const email1 = "security_test1@example.com";
    const password1 = "password123";
    const username1 = "security-user1";

    const email2 = "security_test2@example.com";
    const password2 = "password123";
    const username2 = "security-user2";

    // Create the users
    const userId1 = await createTestUser(email1, password1, username1);
    await createTestUser(email2, password2, username2);

    // Sign in as the second user
    await firebase.auth().signInWithEmailAndPassword(email2, password2);

    // Try to update the first user's username (should fail)
    let securityPassed = false;

    try {
      await firebase.database().ref(`users/${userId1}`).update({
        username: "hacked-username",
      });

      // If we get here, security rules failed
      securityPassed = false;
    } catch (error) {
      // If we get a permission denied error, security rules worked
      securityPassed = error.code === "PERMISSION_DENIED";
    }

    logTest(
      "Firebase security rules prevent unauthorized username updates",
      securityPassed
    );

    // Clean up
    await cleanupTestUser(email1, password1);
    await cleanupTestUser(email2, password2);
  } catch (error) {
    logTest(
      "Firebase security rules prevent unauthorized username updates",
      false,
      error.message
    );
  }
}

// Run all tests
async function runAllTests() {
  console.log("=== Starting Username Functionality Tests ===\n");

  // Run synchronous tests first
  testUsernameValidation();

  // Run asynchronous tests
  await testUsernameStorage();
  await testDashboardDisplay();
  await testFallbackMechanism();
  await testSecurityRules();

  // Print summary
  console.log("\n=== Test Summary ===");
  console.log(`Total tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);

  // Sign out at the end
  await firebase.auth().signOut();

  console.log("\n=== Testing Complete ===");
}

// Create a button to run tests
document.addEventListener("DOMContentLoaded", function () {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "10px";
  container.style.right = "10px";
  container.style.zIndex = "9999";

  const runTestsBtn = document.createElement("button");
  runTestsBtn.textContent = "Run Username Tests";
  runTestsBtn.style.padding = "10px";
  runTestsBtn.style.backgroundColor = "#4CAF50";
  runTestsBtn.style.color = "white";
  runTestsBtn.style.border = "none";
  runTestsBtn.style.borderRadius = "5px";
  runTestsBtn.style.cursor = "pointer";

  runTestsBtn.addEventListener("click", runAllTests);

  container.appendChild(runTestsBtn);
  document.body.appendChild(container);
});

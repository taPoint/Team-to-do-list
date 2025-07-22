document.addEventListener("DOMContentLoaded", function () {
  // Элементы DOM
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const loginError = document.getElementById("login-error");
  const registerError = document.getElementById("register-error");

  // Инициализация Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyCcJmrK_ctL2kj9-w6C-YFJ2RGdXgn_-KI",
    authDomain: "teamtodolist-a126a.firebaseapp.com",
    databaseURL:
      "https://teamtodolist-a126a-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "teamtodolist-a126a",
    storageBucket: "teamtodolist-a126a.appspot.com",
    messagingSenderId: "497218007909",
    appId: "1:497218007909:web:8cabf0a05ae7801909278c",
  };

  // Проверяем, не инициализирован ли Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Переключение между формами
  showRegister.addEventListener("click", function (e) {
    e.preventDefault();
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    clearErrors();
  });

  showLogin.addEventListener("click", function (e) {
    e.preventDefault();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    clearErrors();
  });

  function clearErrors() {
    loginError.textContent = "";
    registerError.textContent = "";
  }

  // Вход
  loginBtn.addEventListener("click", function () {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      loginError.textContent = "Заполните все поля";
      return;
    }

    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        window.location.href = "dashboard.html";
      })
      .catch((error) => {
        handleAuthError(error, loginError);
      });
  });

  // Функция валидации имени пользователя
  function validateUsername(username) {
    // Проверка на пустое значение
    if (!username) {
      return "Имя пользователя не может быть пустым";
    }

    // Проверка длины (от 3 до 20 символов)
    if (username.length < 3 || username.length > 20) {
      return "Имя пользователя должно быть от 3 до 20 символов";
    }

    // Проверка на допустимые символы (буквы, цифры, подчеркивания и дефисы)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return "Имя пользователя может содержать только буквы, цифры, подчеркивания и дефисы";
    }

    // Если все проверки пройдены
    return null;
  }

  // Регистрация
  registerBtn.addEventListener("click", function () {
    const email = document.getElementById("register-email").value;
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm").value;

    // Валидация
    if (!email || !password || !confirmPassword || !username) {
      registerError.textContent = "Заполните все поля";
      return;
    }

    // Валидация имени пользователя
    const usernameError = validateUsername(username);
    if (usernameError) {
      registerError.textContent = usernameError;
      return;
    }

    if (password !== confirmPassword) {
      registerError.textContent = "Пароли не совпадают";
      return;
    }

    if (password.length < 6) {
      registerError.textContent = "Пароль должен быть не менее 6 символов";
      return;
    }

    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then(() => {
        // После регистрации сразу добавляем пользователя в команду
        const userId = firebase.auth().currentUser.uid;
        const teamId = "techaid_point";
        const timestamp = firebase.database.ServerValue.TIMESTAMP;

        console.log("Регистрация успешна, ID пользователя:", userId);
        console.log("Сохраняем имя пользователя:", username);

        // Сначала сохраняем данные пользователя
        return firebase
          .database()
          .ref(`users/${userId}`)
          .set({
            username: username,
            email: email,
            createdAt: timestamp,
          })
          .then(() => {
            console.log("Данные пользователя сохранены, добавляем в команду");

            // Затем добавляем пользователя в команду
            const teamUpdates = {};
            teamUpdates[`teams/${teamId}/members/${userId}`] = true;
            teamUpdates[`userTeams/${userId}/${teamId}`] = {
              teamId: teamId,
              teamName: "Становление TechAid Point",
              joinedAt: timestamp,
            };

            return firebase.database().ref().update(teamUpdates);
          });
      })
      .then(() => {
        console.log("Все данные успешно сохранены!");
        // Добавляем небольшую задержку перед перенаправлением, чтобы данные успели сохраниться
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      })
      .catch((error) => {
        handleAuthError(error, registerError);
      });
  });

  // Проверка авторизации
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });

  // Обработчик ошибок
  function handleAuthError(error, errorElement) {
    console.error("Ошибка:", error);

    const errorMessages = {
      "auth/email-already-in-use": "Email уже используется",
      "auth/invalid-email": "Некорректный email",
      "auth/operation-not-allowed": "Регистрация отключена",
      "auth/weak-password": "Слабый пароль (минимум 6 символов)",
      "auth/user-disabled": "Аккаунт отключён",
      "auth/user-not-found": "Пользователь не найден",
      "auth/wrong-password": "Неверный пароль",
      "auth/too-many-requests": "Слишком много запросов, попробуйте позже",
    };

    errorElement.textContent = errorMessages[error.code] || "Произошла ошибка";
  }
});

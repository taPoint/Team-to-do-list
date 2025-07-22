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
      .then((userCredential) => {
        // Получаем пользователя из результата регистрации
        const user = userCredential.user;
        const userId = user.uid;
        const teamId = "techaid_point";
        const timestamp = firebase.database.ServerValue.TIMESTAMP;

        console.log("Регистрация успешна, ID пользователя:", userId);
        console.log("Сохраняем имя пользователя:", username);

        // Сначала сохраняем данные пользователя
        const userData = {
          username: username,
          email: email,
          createdAt: timestamp,
        };

        console.log("Попытка сохранить данные пользователя:", userData);

        return firebase
          .database()
          .ref(`users/${userId}`)
          .set(userData)
          .then(() => {
            console.log("Данные пользователя успешно сохранены в Firebase!");

            // Проверяем, что данные действительно сохранились
            return firebase.database().ref(`users/${userId}`).once("value");
          })
          .then((snapshot) => {
            const savedData = snapshot.val();
            console.log("Проверка сохраненных данных:", savedData);

            if (!savedData || !savedData.username) {
              throw new Error(
                "Данные пользователя не были сохранены корректно"
              );
            }

            // Затем добавляем пользователя в команду
            const teamUpdates = {};
            teamUpdates[`teams/${teamId}/members/${userId}`] = true;
            teamUpdates[`userTeams/${userId}/${teamId}`] = {
              teamId: teamId,
              teamName: "Становление TechAid Point",
              joinedAt: timestamp,
            };

            console.log("Добавляем пользователя в команду...");
            return firebase.database().ref().update(teamUpdates);
          })
          .then(() => {
            console.log("Пользователь добавлен в команду!");
            return { userId, username, email };
          });
      })
      .then((userData) => {
        console.log(
          "Все данные успешно сохранены для пользователя:",
          userData.username
        );

        // Показываем сообщение об успешной регистрации
        registerError.style.color = "green";
        registerError.textContent = `Регистрация успешна! Добро пожаловать, ${userData.username}!`;

        // Добавляем задержку перед перенаправлением
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 2000);
      })
      .catch((error) => {
        console.error("Ошибка при регистрации:", error);
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
      "auth/email-already-in-use":
        "Этот email уже используется другим аккаунтом",
      "auth/invalid-email": "Некорректный формат email",
      "auth/operation-not-allowed": "Регистрация временно отключена",
      "auth/weak-password": "Слабый пароль (минимум 6 символов)",
      "auth/user-disabled": "Этот аккаунт заблокирован",
      "auth/user-not-found": "Неверный email или пароль",
      "auth/wrong-password": "Неверный email или пароль",
      "auth/invalid-credential": "Неверный email или пароль",
      "auth/too-many-requests": "Слишком много попыток входа. Попробуйте позже",
      "auth/network-request-failed":
        "Ошибка сети. Проверьте подключение к интернету",
      "auth/internal-error": "Внутренняя ошибка сервера. Попробуйте позже",
    };

    errorElement.textContent =
      errorMessages[error.code] || "Неверный email или пароль";
  }
});
// Функция для запуска демо-режима
function startDemoMode() {
  console.log("Запуск демо-режима...");

  // Устанавливаем флаг демо-режима
  localStorage.setItem("demoMode", "true");
  localStorage.setItem(
    "demoUser",
    JSON.stringify({
      uid: "demo-user-" + Date.now(),
      email: "demo@example.com",
      username: "Демо-пользователь",
    })
  );

  // Создаем демо-команду
  const demoTeam = {
    id: "demo-team",
    name: "Демо-проект",
    tasks: {
      "demo-task-1": {
        title: "Добро пожаловать в демо-режим!",
        description:
          "Это пример задачи. Попробуйте добавить свою задачу или отметить эту как выполненную.",
        difficulty: 2,
        completed: false,
        createdAt: Date.now() - 3600000, // 1 час назад
      },
      "demo-task-2": {
        title: "Изучить функционал",
        description: "Попробуйте разные уровни сложности и фильтры задач",
        difficulty: 1,
        completed: false,
        createdAt: Date.now() - 1800000, // 30 минут назад
      },
      "demo-task-3": {
        title: "Выполненная задача",
        description: "Пример выполненной задачи",
        difficulty: 3,
        completed: true,
        createdAt: Date.now() - 7200000, // 2 часа назад
        completedAt: Date.now() - 3600000, // 1 час назад
      },
    },
  };

  localStorage.setItem("demoTeam", JSON.stringify(demoTeam));
  localStorage.setItem("currentTeam", "demo-team");

  // Перенаправляем на главную страницу
  window.location.href = "index.html";
}

// Добавляем обработчик для кнопки демо-режима
document.addEventListener("DOMContentLoaded", function () {
  const demoBtn = document.getElementById("demoBtn");
  if (demoBtn) {
    demoBtn.addEventListener("click", startDemoMode);
  }
});

// Скрипт для исправления проблемы с отображением имени пользователя
document.addEventListener("DOMContentLoaded", function () {
  // Проверяем, авторизован ли пользователь
  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      console.log("Запуск диагностики имени пользователя для:", user.uid);

      // Проверяем наличие имени пользователя в базе данных
      checkUsername(user.uid);
    }
  });

  // Функция для проверки имени пользователя
  function checkUsername(userId) {
    firebase
      .database()
      .ref(`users/${userId}`)
      .once("value")
      .then((snapshot) => {
        const userData = snapshot.val();

        console.log("Данные пользователя:", userData);

        if (!userData) {
          console.log(
            "Пользователь не найден в базе данных, создаем запись..."
          );
          showUsernameForm(userId, null);
        } else if (!userData.username) {
          console.log(
            "Имя пользователя не установлено, предлагаем установить..."
          );
          showUsernameForm(userId, userData.email);
        } else {
          console.log("Имя пользователя найдено:", userData.username);
          // Проверяем, отображается ли имя пользователя правильно
          const userNameEl = document.getElementById("userName");
          if (userNameEl && userNameEl.textContent !== userData.username) {
            console.log(
              "Имя пользователя отображается неправильно, обновляем..."
            );
            userNameEl.textContent = userData.username;
            userNameEl.classList.add("has-username");
            userNameEl.classList.remove("no-username");
          }
        }
      })
      .catch((error) => {
        console.error("Ошибка при проверке имени пользователя:", error);
      });
  }

  // Функция для отображения формы установки имени пользователя
  function showUsernameForm(userId, email) {
    // Создаем модальное окно
    const modal = document.createElement("div");
    modal.className = "username-modal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1000";

    // Создаем содержимое модального окна
    const modalContent = document.createElement("div");
    modalContent.className = "username-modal-content";
    modalContent.style.backgroundColor = "white";
    modalContent.style.padding = "20px";
    modalContent.style.borderRadius = "5px";
    modalContent.style.maxWidth = "400px";
    modalContent.style.width = "90%";

    // Заголовок
    const title = document.createElement("h2");
    title.textContent = "Установка имени пользователя";
    title.style.marginTop = "0";

    // Описание
    const description = document.createElement("p");
    description.textContent =
      "Пожалуйста, установите имя пользователя для вашего аккаунта. Оно будет отображаться вместо email в списке участников команды.";

    // Форма
    const form = document.createElement("div");

    // Поле ввода
    const input = document.createElement("input");
    input.type = "text";
    input.id = "new-username";
    input.placeholder = "Имя пользователя";
    input.style.width = "100%";
    input.style.padding = "10px";
    input.style.marginBottom = "10px";
    input.style.boxSizing = "border-box";
    input.style.border = "1px solid #ddd";
    input.style.borderRadius = "4px";

    // Сообщение об ошибке
    const errorMsg = document.createElement("div");
    errorMsg.id = "username-error";
    errorMsg.style.color = "red";
    errorMsg.style.marginBottom = "10px";
    errorMsg.style.fontSize = "14px";

    // Кнопки
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-between";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Сохранить";
    saveButton.style.padding = "10px 20px";
    saveButton.style.backgroundColor = "#4361ee";
    saveButton.style.color = "white";
    saveButton.style.border = "none";
    saveButton.style.borderRadius = "4px";
    saveButton.style.cursor = "pointer";

    const skipButton = document.createElement("button");
    skipButton.textContent = "Пропустить";
    skipButton.style.padding = "10px 20px";
    skipButton.style.backgroundColor = "#f5f5f5";
    skipButton.style.color = "#333";
    skipButton.style.border = "none";
    skipButton.style.borderRadius = "4px";
    skipButton.style.cursor = "pointer";

    // Добавляем элементы в модальное окно
    buttonContainer.appendChild(skipButton);
    buttonContainer.appendChild(saveButton);

    form.appendChild(input);
    form.appendChild(errorMsg);
    form.appendChild(buttonContainer);

    modalContent.appendChild(title);
    modalContent.appendChild(description);
    modalContent.appendChild(form);

    modal.appendChild(modalContent);

    // Добавляем модальное окно на страницу
    document.body.appendChild(modal);

    // Обработчик для кнопки "Сохранить"
    saveButton.addEventListener("click", function () {
      const username = document.getElementById("new-username").value.trim();
      const error = validateUsername(username);

      if (error) {
        document.getElementById("username-error").textContent = error;
        return;
      }

      // Сохраняем имя пользователя
      saveUsername(userId, username, email);

      // Закрываем модальное окно
      document.body.removeChild(modal);
    });

    // Обработчик для кнопки "Пропустить"
    skipButton.addEventListener("click", function () {
      document.body.removeChild(modal);
    });
  }

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

  // Функция для сохранения имени пользователя
  function saveUsername(userId, username, email) {
    const userData = {
      username: username,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
    };

    // Если есть email, добавляем его
    if (email) {
      userData.email = email;
    } else {
      // Если email не передан, используем email из текущего пользователя
      const user = firebase.auth().currentUser;
      if (user && user.email) {
        userData.email = user.email;
      }
    }

    // Если нет createdAt, добавляем его
    userData.createdAt = firebase.database.ServerValue.TIMESTAMP;

    // Сохраняем данные пользователя
    firebase
      .database()
      .ref(`users/${userId}`)
      .update(userData)
      .then(() => {
        console.log("Имя пользователя успешно сохранено:", username);

        // Обновляем отображение имени пользователя на странице
        const userNameEl = document.getElementById("userName");
        if (userNameEl) {
          userNameEl.textContent = username;
          userNameEl.classList.add("has-username");
          userNameEl.classList.remove("no-username");
        }

        // Перезагружаем страницу для применения изменений
        window.location.reload();
      })
      .catch((error) => {
        console.error("Ошибка при сохранении имени пользователя:", error);
        alert("Ошибка при сохранении имени пользователя: " + error.message);
      });
  }
});

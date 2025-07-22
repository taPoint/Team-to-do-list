// Скрипт для исправления проблемы с кнопкой редактирования имени пользователя
document.addEventListener("DOMContentLoaded", function () {
  console.log("Запуск скрипта исправления кнопки редактирования имени...");

  // Функция для добавления обработчика события
  function addEditButtonHandler() {
    const editUsernameBtn = document.getElementById("editUsernameBtn");
    console.log("Поиск кнопки редактирования имени:", editUsernameBtn);

    if (editUsernameBtn) {
      console.log("Кнопка найдена, добавляем обработчик события");

      // Удаляем все существующие обработчики событий
      const newEditBtn = editUsernameBtn.cloneNode(true);
      editUsernameBtn.parentNode.replaceChild(newEditBtn, editUsernameBtn);

      // Добавляем новый обработчик события
      newEditBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Кнопка редактирования имени нажата!");

        // Вызываем функцию редактирования имени
        if (typeof editUsername === "function") {
          editUsername();
        } else {
          // Если функция editUsername не определена, реализуем её здесь
          editUsernameInline();
        }
      });
    } else {
      console.log("Кнопка не найдена, попробуем позже");
      setTimeout(addEditButtonHandler, 500);
    }
  }

  // Встроенная функция редактирования имени пользователя
  function editUsernameInline() {
    const user = firebase.auth().currentUser;
    if (!user) {
      console.error("Пользователь не авторизован");
      return;
    }

    const userNameEl = document.getElementById("userName");
    const currentUsername = userNameEl.textContent;

    const newUsername = prompt(
      "Введите новое имя пользователя:",
      currentUsername === user.email ? "" : currentUsername
    );

    if (!newUsername) {
      console.log("Пользователь отменил ввод");
      return;
    }

    // Валидация имени пользователя
    if (!newUsername) {
      alert("Имя пользователя не может быть пустым");
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      alert("Имя пользователя должно быть от 3 до 20 символов");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(newUsername)) {
      alert(
        "Имя пользователя может содержать только буквы, цифры, подчеркивания и дефисы"
      );
      return;
    }

    // Проверяем, находимся ли мы в демо-режиме
    if (localStorage.getItem("demoMode") === "true") {
      // В демо-режиме обновляем имя пользователя в localStorage
      const demoUser = JSON.parse(localStorage.getItem("demoUser"));
      demoUser.username = newUsername;
      localStorage.setItem("demoUser", JSON.stringify(demoUser));

      // Обновляем отображение на странице
      userNameEl.textContent = newUsername;
      userNameEl.classList.add("has-username");
      userNameEl.classList.remove("no-username");

      // Обновляем инициалы в аватаре
      const userInitialsEl = document.getElementById("userInitials");
      if (userInitialsEl) {
        const initials = newUsername.substring(0, 2).toUpperCase();
        userInitialsEl.textContent = initials;
      }

      alert("Имя пользователя успешно изменено!");
      return;
    }

    // Сохраняем новое имя пользователя в Firebase
    firebase
      .database()
      .ref(`users/${user.uid}`)
      .update({
        username: newUsername,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      })
      .then(() => {
        console.log("Имя пользователя успешно обновлено:", newUsername);

        // Обновляем отображение на странице
        userNameEl.textContent = newUsername;
        userNameEl.classList.add("has-username");
        userNameEl.classList.remove("no-username");

        // Обновляем инициалы в аватаре
        const userInitialsEl = document.getElementById("userInitials");
        if (userInitialsEl) {
          const initials = newUsername.substring(0, 2).toUpperCase();
          userInitialsEl.textContent = initials;
        }

        alert("Имя пользователя успешно изменено!");
      })
      .catch((error) => {
        console.error("Ошибка при обновлении имени пользователя:", error);
        alert("Ошибка при изменении имени пользователя: " + error.message);
      });
  }

  // Запускаем добавление обработчика события
  setTimeout(addEditButtonHandler, 500);
});

document.addEventListener("DOMContentLoaded", function () {
  // Элементы DOM
  const userEmailEl = document.getElementById("userEmail");
  const teamIdInput = document.getElementById("teamId");
  const teamPasswordInput = document.getElementById("teamPassword");
  const joinTeamBtn = document.getElementById("joinTeamBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const teamErrorEl = document.getElementById("teamError");
  const teamsListEl = document.getElementById("teamsList");
  const createTeamBtn = document.getElementById("createTeamBtn");
  const newTeamName = document.getElementById("newTeamName");
  const newTeamPassword = document.getElementById("newTeamPassword");
  const createTeamError = document.getElementById("createTeamError");
  const createdTeamsListEl = document.getElementById("createdTeamsList");

  // Элемент для отображения имени пользователя
  const userNameEl = document.getElementById("userName");

  // Проверка авторизации
  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }

    console.log("Пользователь авторизован:", user.uid);

    // Показываем индикатор загрузки
    userNameEl.textContent = "Загрузка...";
    userEmailEl.textContent = user.email;

    // Загружаем и отображаем имя пользователя
    loadUserData(user.uid);

    // Загружаем команды пользователя
    loadUserTeams(user.uid);
  });

  // Функция для загрузки данных пользователя
  function loadUserData(userId) {
    // Показываем индикатор загрузки
    userNameEl.textContent = "Загрузка...";

    // Получаем текущего пользователя
    const user = firebase.auth().currentUser;
    if (!user) {
      userNameEl.textContent = "Пользователь";
      userEmailEl.textContent = "";
      return;
    }

    // Сохраняем email для отображения в любом случае (Требование 2.3)
    userEmailEl.textContent = user.email;

    // Запрашиваем данные пользователя из Firebase
    firebase
      .database()
      .ref(`users/${userId}`)
      .once("value")
      .then((snapshot) => {
        const userData = snapshot.val();

        if (userData && userData.username) {
          // Если имя пользователя найдено, отображаем его (Требование 2.1)
          userNameEl.textContent = userData.username;

          // Добавляем класс для стилизации
          userNameEl.classList.add("has-username");
          userNameEl.classList.remove("no-username");

          // Согласно требованию 2.3, отображаем и имя пользователя, и email
          // Email уже отображается в userEmailEl

          console.log("Отображаем имя пользователя:", userData.username);
        } else {
          // Если имя пользователя не найдено, используем email в качестве запасного варианта
          // согласно требованию 2.2
          userNameEl.textContent = user.email;

          // Добавляем класс для стилизации
          userNameEl.classList.add("no-username");
          userNameEl.classList.remove("has-username");

          console.log(
            "Имя пользователя не найдено, используем email:",
            user.email
          );
        }
      })
      .catch((error) => {
        console.error("Ошибка при загрузке данных пользователя:", error);

        // В случае ошибки используем полный email в качестве запасного варианта
        userNameEl.textContent = user.email;
        userNameEl.classList.add("no-username");
        userNameEl.classList.remove("has-username");
      });
  }

  function generateTeamId() {
    return "project_" + Math.random().toString(36).substring(2, 11);
  }

  // Создание проекта
  createTeamBtn.addEventListener("click", function () {
    console.log("Нажата кнопка создания проекта");
    const user = firebase.auth().currentUser;
    if (!user) {
      createTeamError.textContent = "Вы не авторизованы";
      return;
    }

    const name = newTeamName.value.trim();
    const password = newTeamPassword.value.trim();

    if (!name || !password) {
      createTeamError.textContent = "Заполните все поля";
      return;
    }

    const userId = user.uid;
    const teamId = generateTeamId();
    console.log("Создаем проект:", teamId, name);

    const teamData = {
      name: name,
      password: password,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      createdBy: userId,
      members: {
        [userId]: true,
      },
    };

    // Сохраняем команду
    firebase
      .database()
      .ref(`teams/${teamId}`)
      .set(teamData)
      .then(() => {
        console.log("Проект успешно создан:", teamId);

        // Сохраняем ID созданного проекта в localStorage
        saveCreatedTeamId(userId, teamId);

        // Очищаем поля ввода
        newTeamName.value = "";
        newTeamPassword.value = "";
        createTeamError.textContent = "";

        // Обновляем список проектов
        loadUserTeams(userId);

        // Показываем уведомление об успешном создании
        createTeamError.style.color = "green";
        createTeamError.textContent = "Проект успешно создан!";
        setTimeout(() => {
          createTeamError.textContent = "";
        }, 3000);
      })
      .catch((error) => {
        console.error("Ошибка создания:", error);
        createTeamError.textContent = "Ошибка: " + error.message;
      });
  });

  // Загрузка проектов пользователя
  function loadUserTeams(userId) {
    console.log("Загрузка проектов для:", userId);

    // Очищаем списки
    teamsListEl.innerHTML = "";
    createdTeamsListEl.innerHTML = "";

    // Счетчики для отслеживания найденных команд
    let joinedTeamsCount = 0;
    let createdTeamsCount = 0;

    // Показываем сообщения о загрузке
    teamsListEl.innerHTML = "<p>Загрузка проектов...</p>";
    createdTeamsListEl.innerHTML = "<p>Загрузка проектов...</p>";

    // Получаем список проектов пользователя из userTeams
    firebase
      .database()
      .ref(`userTeams/${userId}`)
      .once("value")
      .then((snapshot) => {
        const userTeams = snapshot.val() || {};
        const teamIds = Object.keys(userTeams);

        console.log("Найдено проектов в userTeams:", teamIds.length);

        if (teamIds.length === 0) {
          // Если нет проектов в userTeams, показываем сообщение
          teamsListEl.innerHTML = "<p>Вы не состоите ни в одном проекте</p>";
        } else {
          // Очищаем список перед добавлением проектов
          teamsListEl.innerHTML = "";

          // Для каждого ID проекта отображаем информацию из userTeams
          // Это позволит избежать проблем с правами доступа
          teamIds.forEach((teamId) => {
            const teamInfo = userTeams[teamId];
            if (teamInfo) {
              // Отображаем проект на основе данных из userTeams
              renderJoinedTeam(teamId, {
                name: teamInfo.teamName || teamId,
                // Другие данные, которые могут быть в userTeams
                joinedAt: teamInfo.joinedAt,
              });
              joinedTeamsCount++;
            }
          });

          // Добавляем обработчики для кнопок
          addOpenButtonHandlers();
        }
      })
      .catch((error) => {
        console.error(
          "Ошибка при загрузке списка проектов пользователя:",
          error
        );
        teamsListEl.innerHTML = "<p>Ошибка при загрузке проектов</p>";
      });

    // Отдельно загружаем проекты, созданные пользователем
    // Для этого нам нужно проверить каждый проект отдельно
    loadCreatedTeams();

    // Функция для загрузки проектов, созданных пользователем
    function loadCreatedTeams() {
      // Сначала проверяем, есть ли у нас сохраненные ID проектов, созданных пользователем
      const createdTeamIds = localStorage.getItem(`createdTeams_${userId}`);

      if (createdTeamIds) {
        try {
          const teamIds = JSON.parse(createdTeamIds);
          console.log(
            "Найдено сохраненных созданных проектов:",
            teamIds.length
          );

          if (teamIds.length > 0) {
            // Очищаем список перед добавлением проектов
            createdTeamsListEl.innerHTML = "";

            // Для каждого ID проекта загружаем данные
            let loadedCount = 0;

            teamIds.forEach((teamId) => {
              firebase
                .database()
                .ref(`teams/${teamId}`)
                .once("value")
                .then((teamSnapshot) => {
                  if (teamSnapshot.exists()) {
                    const teamData = teamSnapshot.val();

                    // Проверяем, что пользователь действительно создатель
                    if (teamData.createdBy === userId) {
                      renderCreatedTeam(teamId, teamData);
                      createdTeamsCount++;
                    }
                  }

                  // Увеличиваем счетчик загруженных проектов
                  loadedCount++;

                  // Если загрузили все проекты, добавляем обработчики для кнопок
                  if (loadedCount === teamIds.length) {
                    addOpenButtonHandlers();
                  }
                })
                .catch((error) => {
                  console.error(
                    `Ошибка при загрузке проекта ${teamId}:`,
                    error
                  );

                  // Увеличиваем счетчик даже при ошибке
                  loadedCount++;

                  // Если загрузили все проекты, добавляем обработчики для кнопок
                  if (loadedCount === teamIds.length) {
                    addOpenButtonHandlers();
                  }
                });
            });
          } else {
            createdTeamsListEl.innerHTML =
              "<p>Вы не создали ни одного проекта</p>";
          }
        } catch (e) {
          console.error("Ошибка при парсинге сохраненных ID проектов:", e);
          createdTeamsListEl.innerHTML = "<p>Ошибка при загрузке проектов</p>";
        }
      } else {
        createdTeamsListEl.innerHTML = "<p>Вы не создали ни одного проекта</p>";
      }
    }

    // Функция для отображения команды, созданной пользователем
    function renderCreatedTeam(teamId, teamData) {
      const teamCard = document.createElement("div");
      teamCard.className = "created-team-card";
      teamCard.innerHTML = `
        <div class="team-info">
          <strong>${teamData.name || "Без названия"}</strong>
          <p>ID: ${teamId}</p>
          <p>Пароль: ${teamData.password || "Не задан"}</p>
        </div>
        <div class="team-members">
          <h4>Участники:</h4>
          <div id="members-${teamId}"></div>
        </div>
        <div class="team-buttons">
          <button class="team-open-btn" data-team="${teamId}">Открыть</button>
          <button class="team-delete-btn" data-team="${teamId}">Удалить</button>
        </div>
      `;
      createdTeamsListEl.appendChild(teamCard);

      // Добавляем обработчик для кнопки удаления
      const deleteBtn = teamCard.querySelector(".team-delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (
          confirm(`Вы уверены, что хотите удалить проект "${teamData.name}"?`)
        ) {
          deleteTeam(teamId);
        }
      });

      // Загружаем участников, если они есть
      if (teamData.members) {
        loadTeamMembers(teamId, teamData.members);
      }
    }

    // Функция для отображения команды, в которой состоит пользователь
    function renderJoinedTeam(teamId, teamData) {
      const teamCard = document.createElement("div");
      teamCard.className = "team-card";

      // Форматируем дату присоединения, если она есть
      let joinedDateStr = "";
      if (teamData.joinedAt) {
        const joinedDate = new Date(teamData.joinedAt);
        joinedDateStr = `<small>Присоединились: ${joinedDate.toLocaleDateString(
          "ru-RU"
        )}</small>`;
      }

      teamCard.innerHTML = `
        <div class="team-info">
          <span class="team-name">${teamData.name || teamId}</span>
          ${joinedDateStr}
        </div>
        <div class="team-buttons">
          <button class="team-open-btn" data-team="${teamId}">Открыть</button>
          <button class="team-leave-btn" data-team="${teamId}">Выйти</button>
        </div>
      `;
      teamsListEl.appendChild(teamCard);

      // Добавляем обработчик для кнопки выхода из проекта
      const leaveBtn = teamCard.querySelector(".team-leave-btn");
      leaveBtn.addEventListener("click", () => {
        if (
          confirm(`Вы уверены, что хотите выйти из проекта "${teamData.name}"?`)
        ) {
          leaveTeam(teamId);
        }
      });
    }

    // Функция для добавления обработчиков кнопок открытия
    function addOpenButtonHandlers() {
      document.querySelectorAll(".team-open-btn").forEach((btn) => {
        if (!btn.hasAttribute("data-handler-added")) {
          btn.setAttribute("data-handler-added", "true");
          btn.addEventListener("click", (e) => {
            const teamId = e.target.dataset.team;
            localStorage.setItem("currentTeam", teamId);
            window.location.href = "index.html";
          });
        }
      });
    }
  }

  // Функция для получения данных пользователя, включая имя пользователя
  function fetchUserData(userId) {
    return new Promise((resolve) => {
      // Получаем текущего пользователя для сравнения
      const currentUser = firebase.auth().currentUser;
      const isCurrentUser = userId === currentUser.uid;

      // Загружаем данные пользователя из Firebase
      firebase
        .database()
        .ref(`users/${userId}`)
        .once("value")
        .then((snapshot) => {
          const userData = snapshot.val() || {};

          // Формируем объект с данными пользователя
          const userInfo = {
            userId: userId,
            username: userData.username || null,
            email: userData.email || (isCurrentUser ? currentUser.email : null),
            isCurrentUser: isCurrentUser,
          };

          resolve(userInfo);
        })
        .catch((error) => {
          console.error(
            `Ошибка при загрузке данных пользователя ${userId}:`,
            error
          );

          // В случае ошибки возвращаем базовую информацию
          const userInfo = {
            userId: userId,
            username: null,
            email: isCurrentUser ? currentUser.email : null,
            isCurrentUser: isCurrentUser,
            error: true,
          };

          resolve(userInfo);
        });
    });
  }

  // Функция для форматирования отображаемого имени пользователя
  function formatDisplayName(userInfo) {
    let displayName;
    let emailDisplay = "";

    if (userInfo.username) {
      // Если имя пользователя найдено, используем его (Требование 3.1)
      displayName = userInfo.username;

      // Если у пользователя есть email, добавляем его как дополнительную информацию
      if (userInfo.email) {
        emailDisplay = `<span class="member-email">${userInfo.email}</span>`;
      }
    } else {
      // Если имя пользователя не найдено, используем email как запасной вариант (Требование 3.2)
      if (userInfo.email) {
        displayName = userInfo.email;
      } else {
        // Если ни имени пользователя, ни email нет, используем ID как последний запасной вариант
        displayName = `Пользователь: ${userInfo.userId.substring(0, 8)}...`;
      }
    }

    // Добавляем индикатор "(Вы)" для текущего пользователя (Требование 3.3)
    if (userInfo.isCurrentUser) {
      displayName += " (Вы)";
    }

    return {
      displayName: displayName,
      emailDisplay: emailDisplay,
    };
  }

  // Загрузка участников команды
  function loadTeamMembers(teamId, members) {
    const container = document.getElementById(`members-${teamId}`);
    if (!container) return;

    container.innerHTML = "<p>Загрузка участников...</p>";

    // Счетчик для отслеживания загруженных участников
    let loadedCount = 0;
    const totalMembers = Object.keys(members).length;

    // Очищаем контейнер перед добавлением участников
    container.innerHTML = "";

    // Для каждого участника
    Object.keys(members).forEach((userId) => {
      const memberItem = document.createElement("div");
      memberItem.className = "member-item";

      // Временно отображаем загрузку
      memberItem.innerHTML = `<span>Загрузка данных пользователя...</span>`;
      container.appendChild(memberItem);

      // Получаем данные пользователя
      fetchUserData(userId)
        .then((userInfo) => {
          // Форматируем отображаемое имя
          const { displayName, emailDisplay } = formatDisplayName(userInfo);

          // Обновляем отображение участника
          memberItem.innerHTML = `
            <div class="member-info">
              <span class="member-name">${displayName}</span>
              ${emailDisplay}
            </div>
            ${
              !userInfo.isCurrentUser
                ? `<button class="remove-member-btn" onclick="removeMemberFromTeam('${teamId}', '${userId}')">Удалить</button>`
                : ""
            }
          `;

          loadedCount++;

          // Если загрузили всех участников, можем выполнить дополнительные действия
          if (loadedCount === totalMembers) {
            console.log(`Загружены все участники для команды ${teamId}`);
          }
        })
        .catch((error) => {
          console.error(
            `Ошибка при обработке данных пользователя ${userId}:`,
            error
          );

          // Получаем текущего пользователя для сравнения
          const currentUser = firebase.auth().currentUser;
          const isCurrentUser = userId === currentUser.uid;

          // В случае ошибки отображаем email или ID пользователя
          let fallbackName;
          if (isCurrentUser && currentUser.email) {
            fallbackName = currentUser.email;
          } else {
            fallbackName = `Пользователь: ${userId.substring(0, 8)}...`;
          }

          if (isCurrentUser) {
            fallbackName += " (Вы)";
          }

          memberItem.innerHTML = `
            <div class="member-info">
              <span class="member-name">${fallbackName}</span>
            </div>
            ${
              !isCurrentUser
                ? `<button class="remove-member-btn" onclick="removeMemberFromTeam('${teamId}', '${userId}')">Удалить</button>`
                : ""
            }
          `;

          loadedCount++;

          if (loadedCount === totalMembers) {
            console.log(`Загружены все участники для команды ${teamId}`);
          }
        });
    });
  }

  // Вход в существующий проект
  joinTeamBtn.addEventListener("click", function () {
    const user = firebase.auth().currentUser;
    if (!user) {
      teamErrorEl.textContent = "Вы не авторизованы";
      return;
    }

    const teamId = teamIdInput.value.trim();
    const password = teamPasswordInput.value.trim();

    if (!teamId || !password) {
      teamErrorEl.textContent = "Заполните все поля";
      return;
    }

    console.log("Попытка входа в проект:", teamId);
    teamErrorEl.textContent = "Проверка данных...";
    teamErrorEl.style.color = "";

    // Проверяем, не состоит ли пользователь уже в этом проекте
    firebase
      .database()
      .ref(`userTeams/${user.uid}/${teamId}`)
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          console.log("Пользователь уже является участником проекта");
          teamErrorEl.style.color = "green";
          teamErrorEl.textContent = "Вы уже состоите в этом проекте";

          // Очищаем поля ввода
          teamIdInput.value = "";
          teamPasswordInput.value = "";

          return;
        }

        // Используем функцию joinTeam из join_team.js
        joinTeam(teamId, password, user.uid)
          .then((result) => {
            console.log("Успешное присоединение к проекту:", result);

            // Добавляем в userTeams
            return firebase
              .database()
              .ref(`userTeams/${user.uid}/${teamId}`)
              .set({
                teamName: result.teamName || teamId,
                teamId: teamId,
                joinedAt: firebase.database.ServerValue.TIMESTAMP,
              });
          })
          .then(() => {
            console.log("Проект добавлен в список проектов пользователя");
            teamErrorEl.style.color = "green";
            teamErrorEl.textContent = "Вы успешно присоединились к проекту!";

            // Очищаем поля ввода
            teamIdInput.value = "";
            teamPasswordInput.value = "";

            // Обновляем список проектов
            loadUserTeams(user.uid);

            // Через 3 секунды убираем сообщение
            setTimeout(() => {
              if (teamErrorEl.style.color === "green") {
                teamErrorEl.textContent = "";
              }
            }, 3000);
          })
          .catch((error) => {
            console.error("Ошибка входа:", error);
            teamErrorEl.style.color = "red";
            teamErrorEl.textContent =
              error.message || "Ошибка при присоединении к проекту";
          });
      })
      .catch((error) => {
        console.error("Ошибка при проверке участия в проекте:", error);
        teamErrorEl.style.color = "red";
        teamErrorEl.textContent = "Ошибка при проверке участия в проекте";
      });
  });

  // Функция удаления проекта
  function deleteTeam(teamId) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    console.log("Удаление проекта:", teamId);

    // Удаляем проект из базы данных
    firebase
      .database()
      .ref(`teams/${teamId}`)
      .remove()
      .then(() => {
        console.log("Проект успешно удален");

        // Удаляем ID проекта из localStorage
        removeCreatedTeamId(user.uid, teamId);

        // Обновляем список проектов
        loadUserTeams(user.uid);
      })
      .catch((error) => {
        console.error("Ошибка при удалении проекта:", error);
        alert("Ошибка при удалении проекта: " + error.message);
      });
  }

  // Функция выхода из проекта
  function leaveTeam(teamId) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    console.log("Выход из проекта:", teamId);

    // Удаляем пользователя из списка участников проекта
    firebase
      .database()
      .ref(`teams/${teamId}/members/${user.uid}`)
      .remove()
      .then(() => {
        // Удаляем проект из списка проектов пользователя
        return firebase
          .database()
          .ref(`userTeams/${user.uid}/${teamId}`)
          .remove();
      })
      .then(() => {
        console.log("Успешный выход из проекта");
        // Обновляем список проектов
        loadUserTeams(user.uid);
      })
      .catch((error) => {
        console.error("Ошибка при выходе из проекта:", error);
        alert("Ошибка при выходе из проекта: " + error.message);
      });
  }

  // Функция для сохранения ID созданного проекта в localStorage
  function saveCreatedTeamId(userId, teamId) {
    // Получаем текущий список созданных проектов
    const createdTeamsStr = localStorage.getItem(`createdTeams_${userId}`);
    let createdTeams = [];

    if (createdTeamsStr) {
      try {
        createdTeams = JSON.parse(createdTeamsStr);
      } catch (e) {
        console.error("Ошибка при парсинге сохраненных ID проектов:", e);
      }
    }

    // Добавляем новый ID, если его еще нет в списке
    if (!createdTeams.includes(teamId)) {
      createdTeams.push(teamId);
      localStorage.setItem(
        `createdTeams_${userId}`,
        JSON.stringify(createdTeams)
      );
      console.log("ID проекта сохранен в localStorage:", teamId);
    }
  }

  // Функция для удаления ID проекта из localStorage
  function removeCreatedTeamId(userId, teamId) {
    // Получаем текущий список созданных проектов
    const createdTeamsStr = localStorage.getItem(`createdTeams_${userId}`);
    if (!createdTeamsStr) return;

    try {
      let createdTeams = JSON.parse(createdTeamsStr);

      // Удаляем ID проекта из списка
      createdTeams = createdTeams.filter((id) => id !== teamId);

      // Сохраняем обновленный список
      localStorage.setItem(
        `createdTeams_${userId}`,
        JSON.stringify(createdTeams)
      );
      console.log("ID проекта удален из localStorage:", teamId);
    } catch (e) {
      console.error(
        "Ошибка при парсинге или обновлении сохраненных ID проектов:",
        e
      );
    }
  }

  // Выход из аккаунта
  logoutBtn.addEventListener("click", function () {
    firebase
      .auth()
      .signOut()
      .then(() => {
        window.location.href = "auth.html";
      });
  });
});

// Функция для удаления участника из проекта
function removeMemberFromTeam(teamId, userId) {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) return;

  console.log("Удаление участника из проекта:", userId, "из", teamId);

  // Удаляем участника из списка участников проекта
  firebase
    .database()
    .ref(`teams/${teamId}/members/${userId}`)
    .remove()
    .then(() => {
      // Удаляем проект из списка проектов удаляемого пользователя
      return firebase.database().ref(`userTeams/${userId}/${teamId}`).remove();
    })
    .then(() => {
      console.log("Участник успешно удален из проекта");
      // Обновляем список проектов для отображения изменений
      // Поскольку функция теперь глобальная, нам нужно получить loadUserTeams
      // Мы можем просто перезагрузить страницу, чтобы обновить данные
      window.location.reload();
    })
    .catch((error) => {
      console.error("Ошибка при удалении участника:", error);
      alert("Ошибка при удалении участника: " + error.message);
    });
}

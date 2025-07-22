// Функционал демо-режима для командного To-Do List
// Этот скрипт эмулирует работу с Firebase в локальном режиме

// Проверяем, находимся ли мы в демо-режиме
function isDemoMode() {
  return localStorage.getItem("demoMode") === "true";
}

// Получаем данные демо-пользователя
function getDemoUser() {
  const demoUserStr = localStorage.getItem("demoUser");
  return demoUserStr ? JSON.parse(demoUserStr) : null;
}

// Получаем данные демо-команды
function getDemoTeam() {
  const demoTeamStr = localStorage.getItem("demoTeam");
  return demoTeamStr ? JSON.parse(demoTeamStr) : null;
}

// Эмуляция Firebase Auth для демо-режима
if (isDemoMode()) {
  console.log("Запущен демо-режим!");

  // Переопределяем методы Firebase Auth
  if (typeof firebase !== "undefined" && firebase.auth) {
    const originalAuthOnStateChanged = firebase.auth().onAuthStateChanged;

    // Переопределяем onAuthStateChanged
    firebase.auth().onAuthStateChanged = function (callback) {
      if (isDemoMode()) {
        // В демо-режиме сразу вызываем callback с демо-пользователем
        setTimeout(() => {
          const demoUser = getDemoUser();
          if (demoUser) {
            callback({
              uid: demoUser.uid,
              email: demoUser.email,
              displayName: demoUser.username,
              // Эмулируем другие необходимые свойства пользователя
              emailVerified: true,
              isAnonymous: false,
              metadata: {
                creationTime: new Date().toISOString(),
                lastSignInTime: new Date().toISOString(),
              },
              providerData: [
                {
                  providerId: "demo",
                  uid: demoUser.uid,
                  displayName: demoUser.username,
                  email: demoUser.email,
                },
              ],
              // Эмулируем методы пользователя
              delete: () => Promise.resolve(),
              getIdToken: () => Promise.resolve("demo-token"),
              reload: () => Promise.resolve(),
              reauthenticateWithCredential: () => Promise.resolve(),
            });
          }
        }, 100);
        return () => {}; // Возвращаем функцию отписки
      } else {
        // В обычном режиме используем оригинальный метод
        return originalAuthOnStateChanged.call(firebase.auth(), callback);
      }
    };

    // Переопределяем currentUser
    Object.defineProperty(firebase.auth(), "currentUser", {
      get: function () {
        if (isDemoMode()) {
          const demoUser = getDemoUser();
          if (demoUser) {
            return {
              uid: demoUser.uid,
              email: demoUser.email,
              displayName: demoUser.username,
              // Эмулируем другие необходимые свойства пользователя
              emailVerified: true,
              isAnonymous: false,
              metadata: {
                creationTime: new Date().toISOString(),
                lastSignInTime: new Date().toISOString(),
              },
              providerData: [
                {
                  providerId: "demo",
                  uid: demoUser.uid,
                  displayName: demoUser.username,
                  email: demoUser.email,
                },
              ],
              // Эмулируем методы пользователя
              delete: () => Promise.resolve(),
              getIdToken: () => Promise.resolve("demo-token"),
              reload: () => Promise.resolve(),
              reauthenticateWithCredential: () => Promise.resolve(),
            };
          }
          return null;
        } else {
          // В обычном режиме возвращаем оригинальное значение
          return this._currentUser;
        }
      },
    });
  }

  // Переопределяем методы Firebase Database для демо-режима
  if (typeof firebase !== "undefined" && firebase.database) {
    const originalDatabaseRef = firebase.database().ref;

    firebase.database().ref = function (path) {
      if (isDemoMode()) {
        // Создаем объект, эмулирующий работу с базой данных
        return {
          once: function (eventType) {
            return new Promise((resolve) => {
              setTimeout(() => {
                if (path.startsWith("users/")) {
                  // Запрос данных пользователя
                  const demoUser = getDemoUser();
                  resolve({
                    val: () => ({
                      username: demoUser.username,
                      email: demoUser.email,
                      createdAt: Date.now() - 86400000, // 1 день назад
                    }),
                    exists: () => true,
                  });
                } else if (path.startsWith("teams/")) {
                  // Запрос данных команды
                  const demoTeam = getDemoTeam();
                  if (path === "teams/demo-team") {
                    resolve({
                      val: () => ({
                        name: demoTeam.name,
                        members: { [getDemoUser().uid]: true },
                        tasks: demoTeam.tasks,
                      }),
                      exists: () => true,
                    });
                  } else if (path === "teams/demo-team/tasks") {
                    resolve({
                      val: () => demoTeam.tasks,
                      exists: () => true,
                    });
                  } else {
                    resolve({
                      val: () => null,
                      exists: () => false,
                    });
                  }
                } else if (path.startsWith("userTeams/")) {
                  // Запрос списка команд пользователя
                  resolve({
                    val: () => ({
                      "demo-team": {
                        teamId: "demo-team",
                        teamName: "Демо-проект",
                        joinedAt: Date.now() - 86400000,
                      },
                    }),
                    exists: () => true,
                  });
                } else {
                  resolve({
                    val: () => null,
                    exists: () => false,
                  });
                }
              }, 100);
            });
          },
          on: function (eventType, callback) {
            setTimeout(() => {
              if (path.startsWith("teams/demo-team/tasks")) {
                // Запрос задач команды
                const demoTeam = getDemoTeam();
                callback({
                  val: () => demoTeam.tasks,
                  exists: () => true,
                });
              } else if (path === ".info/connected") {
                callback({
                  val: () => true,
                });
              }
            }, 100);
            return this;
          },
          off: function () {
            return this;
          },
          update: function (data) {
            return new Promise((resolve) => {
              setTimeout(() => {
                if (path.startsWith("users/")) {
                  // Обновление данных пользователя
                  const demoUser = getDemoUser();
                  if (data.username) {
                    demoUser.username = data.username;
                    localStorage.setItem("demoUser", JSON.stringify(demoUser));
                  }
                }
                resolve();
              }, 100);
            });
          },
          set: function (data) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve();
              }, 100);
            });
          },
          push: function () {
            const newKey = "demo-task-" + Date.now();
            return {
              key: newKey,
              set: (data) => {
                return new Promise((resolve) => {
                  setTimeout(() => {
                    const demoTeam = getDemoTeam();
                    if (!demoTeam.tasks) {
                      demoTeam.tasks = {};
                    }
                    demoTeam.tasks[newKey] = data;
                    localStorage.setItem("demoTeam", JSON.stringify(demoTeam));
                    resolve();
                  }, 100);
                });
              },
            };
          },
          child: function (childPath) {
            return firebase.database().ref(path + "/" + childPath);
          },
          remove: function () {
            return new Promise((resolve) => {
              setTimeout(() => {
                if (path.startsWith("teams/demo-team/tasks/")) {
                  // Удаление задачи
                  const taskId = path.split("/").pop();
                  const demoTeam = getDemoTeam();
                  if (demoTeam.tasks && demoTeam.tasks[taskId]) {
                    delete demoTeam.tasks[taskId];
                    localStorage.setItem("demoTeam", JSON.stringify(demoTeam));
                  }
                }
                resolve();
              }, 100);
            });
          },
        };
      } else {
        // В обычном режиме используем оригинальный метод
        return originalDatabaseRef.call(firebase.database(), path);
      }
    };
  }
}

// Функция для выхода из демо-режима
function exitDemoMode() {
  localStorage.removeItem("demoMode");
  localStorage.removeItem("demoUser");
  localStorage.removeItem("demoTeam");
  localStorage.removeItem("currentTeam");
  window.location.href = "auth.html";
}

// Добавляем кнопку выхода из демо-режима, если мы в демо-режиме
document.addEventListener("DOMContentLoaded", function () {
  if (isDemoMode()) {
    console.log("Инициализация демо-режима на странице...");

    // Добавляем индикатор демо-режима
    const container = document.querySelector(
      ".dashboard-container, .container"
    );
    if (container) {
      const demoIndicator = document.createElement("div");
      demoIndicator.className = "demo-mode-indicator";
      demoIndicator.innerHTML = `
        <span>Демо-режим</span>
        <button id="exitDemoBtn">Выйти из демо</button>
      `;
      container.insertBefore(demoIndicator, container.firstChild);

      // Добавляем стили для индикатора
      const style = document.createElement("style");
      style.textContent = `
        .demo-mode-indicator {
          background: linear-gradient(135deg, #ff9a00, #ff5252);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        #exitDemoBtn {
          background: rgba(255,255,255,0.3);
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 0.8rem;
          transition: background 0.3s;
        }
        #exitDemoBtn:hover {
          background: rgba(255,255,255,0.5);
        }
      `;
      document.head.appendChild(style);

      // Добавляем обработчик для кнопки выхода
      document
        .getElementById("exitDemoBtn")
        .addEventListener("click", exitDemoMode);
    }

    // Отключаем отправку уведомлений в Telegram в демо-режиме
    window.sendTelegramAlert = function () {
      console.log("Отправка уведомлений отключена в демо-режиме");
      return Promise.resolve();
    };
  }
});

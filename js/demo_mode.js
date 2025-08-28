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
                        createdBy: getDemoUser().uid,
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
                  const demoUser = getDemoUser();
                  if (path === `userTeams/${demoUser.uid}`) {
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

// Добавляем кнопку выхода из демо-режима и отключаем создание проектов в демо-режиме
document.addEventListener("DOMContentLoaded", function () {
  if (isDemoMode()) {
    // Отключаем создание проектов в демо-режиме
    if (window.location.pathname.includes("dashboard.html")) {
      const createTeamBtn = document.getElementById("createTeamBtn");
      const joinTeamBtn = document.getElementById("joinTeamBtn");
      const createTeamError = document.getElementById("createTeamError");
      const teamError = document.getElementById("teamError");

      if (createTeamBtn) {
        createTeamBtn.disabled = true;
        createTeamBtn.style.opacity = "0.5";
        createTeamBtn.style.cursor = "not-allowed";
        createTeamError.textContent = "Недоступно в демо-режиме";
        createTeamError.style.color = "#888";
      }

      if (joinTeamBtn) {
        joinTeamBtn.disabled = true;
        joinTeamBtn.style.opacity = "0.5";
        joinTeamBtn.style.cursor = "not-allowed";
        teamError.textContent = "Недоступно в демо-режиме";
        teamError.style.color = "#888";
      }
    }

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
// Функция инициализации приложения в демо-режиме
function initAppDemoMode() {
  console.log("Инициализация приложения в демо-режиме");

  const demoTeam = getDemoTeam();
  if (!demoTeam) {
    console.error("Демо-команда не найдена");
    return;
  }

  // Получаем элементы DOM
  const taskTitleInput = document.getElementById("taskTitle");
  const taskDescInput = document.getElementById("taskDesc");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const activeTasksList = document.getElementById("activeTasks");
  const completedTasksList = document.getElementById("completedTasks");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const taskDifficultySelect = document.getElementById("taskDifficulty");

  // Настраиваем селектор сложности
  if (taskDifficultySelect) {
    taskDifficultySelect.addEventListener("change", function () {
      const value = this.value;
      this.className = `difficulty-select difficulty-${value}`;
    });
    taskDifficultySelect.className = `difficulty-select difficulty-${taskDifficultySelect.value}`;
  }

  // Настраиваем фильтрацию задач
  let currentFilter = "all";

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.filter;
      applyFilter();
    });
  });

  function applyFilter() {
    const allTasks = document.querySelectorAll(".tasks li");

    allTasks.forEach((task) => {
      const isCompleted = task.classList.contains("completed");

      switch (currentFilter) {
        case "active":
          task.style.display = isCompleted ? "none" : "flex";
          break;
        case "completed":
          task.style.display = isCompleted ? "flex" : "none";
          break;
        default:
          task.style.display = "flex";
      }
    });
  }

  // Добавление задачи
  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", () => {
      const title = taskTitleInput.value.trim();
      const description = taskDescInput.value.trim();
      const difficulty = taskDifficultySelect.value;

      if (!title) {
        alert("Введите заголовок!");
        return;
      }

      const newTask = {
        title,
        description,
        difficulty: parseInt(difficulty),
        completed: false,
        createdAt: Date.now(),
        completedAt: null,
      };

      // Добавляем задачу в локальное хранилище
      const demoTeam = getDemoTeam();
      const taskId = "demo-task-" + Date.now();

      if (!demoTeam.tasks) {
        demoTeam.tasks = {};
      }

      demoTeam.tasks[taskId] = newTask;
      localStorage.setItem("demoTeam", JSON.stringify(demoTeam));

      // Очищаем поля ввода
      taskTitleInput.value = "";
      taskDescInput.value = "";

      // Отображаем новую задачу
      renderTask(taskId, newTask);

      // Обновляем счетчики
      updateTaskCounters();

      console.log("Задача добавлена в демо-режиме:", newTask);
    });
  }

  // Отображение задач
  function renderTask(taskId, task) {
    const li = document.createElement("li");
    li.classList.add(`difficulty-${task.difficulty || 2}`);
    if (task.completed) li.classList.add("completed");

    const isNew = Date.now() - task.createdAt < 60000;
    if (isNew) li.classList.add("new-task");

    li.innerHTML = `
      <div class="task-content">
        <strong class="task-title">${task.title}</strong>
        <p class="task-desc">${task.description || "—"}</p>
        <span class="task-difficulty">${getDifficultyName(
          task.difficulty
        )}</span>
        <span class="task-time">
          Добавлено: ${new Date(task.createdAt).toLocaleString()}
          ${
            task.completedAt
              ? `<br>Выполнено: ${new Date(task.completedAt).toLocaleString()}`
              : ""
          }
        </span>
      </div>
      <div class="task-meta">
        <div class="task-actions">
          ${
            !task.completed
              ? `
            <button class="complete-btn" data-id="${taskId}">✓</button>
            <button class="edit-btn" data-id="${taskId}">✎</button>
          `
              : `
            <button class="reopen-btn" data-id="${taskId}">↩</button>
          `
          }
          <button class="delete-btn" data-id="${taskId}">✕</button>
        </div>
      </div>
    `;

    // Добавляем обработчики событий для кнопок
    const completeBtn = li.querySelector(".complete-btn");
    if (completeBtn) {
      completeBtn.addEventListener("click", () => {
        const demoTeam = getDemoTeam();
        demoTeam.tasks[taskId].completed = true;
        demoTeam.tasks[taskId].completedAt = Date.now();
        localStorage.setItem("demoTeam", JSON.stringify(demoTeam));

        // Перерисовываем задачи
        loadTasks();
      });
    }

    const reopenBtn = li.querySelector(".reopen-btn");
    if (reopenBtn) {
      reopenBtn.addEventListener("click", () => {
        const demoTeam = getDemoTeam();
        demoTeam.tasks[taskId].completed = false;
        demoTeam.tasks[taskId].completedAt = null;
        localStorage.setItem("demoTeam", JSON.stringify(demoTeam));

        // Перерисовываем задачи
        loadTasks();
      });
    }

    const editBtn = li.querySelector(".edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const title = prompt("Введите новый заголовок:", task.title);
        if (!title) return;

        const description = prompt(
          "Введите новое описание:",
          task.description || ""
        );

        const demoTeam = getDemoTeam();
        demoTeam.tasks[taskId].title = title;
        demoTeam.tasks[taskId].description = description;
        localStorage.setItem("demoTeam", JSON.stringify(demoTeam));

        // Перерисовываем задачи
        loadTasks();
      });
    }

    const deleteBtn = li.querySelector(".delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm("Удалить задачу?")) {
          const demoTeam = getDemoTeam();
          delete demoTeam.tasks[taskId];
          localStorage.setItem("demoTeam", JSON.stringify(demoTeam));

          // Перерисовываем задачи
          loadTasks();
        }
      });
    }

    if (task.completed) {
      completedTasksList.appendChild(li);
    } else {
      activeTasksList.appendChild(li);
    }
  }

  // Загрузка задач
  function loadTasks() {
    // Очищаем списки задач
    activeTasksList.innerHTML = "";
    completedTasksList.innerHTML = "";

    const demoTeam = getDemoTeam();
    if (!demoTeam || !demoTeam.tasks) return;

    // Преобразуем объект задач в массив
    const tasksArray = Object.entries(demoTeam.tasks);

    // Разделяем задачи на активные и выполненные
    const activeTasks = tasksArray.filter(([_, task]) => !task.completed);
    const completedTasks = tasksArray.filter(([_, task]) => task.completed);

    // Обновляем счетчики
    document.getElementById("activeCount").textContent = activeTasks.length;
    document.getElementById("completedCount").textContent =
      completedTasks.length;

    // Сортируем активные по дате создания (новые сверху)
    activeTasks.sort((a, b) => b[1].createdAt - a[1].createdAt);

    // Сортируем выполненные по дате выполнения (новые сверху)
    completedTasks.sort((a, b) => {
      if (b[1].completedAt && a[1].completedAt) {
        return b[1].completedAt - a[1].completedAt;
      }
      return 0;
    });

    // Отображаем задачи
    activeTasks.forEach(([taskId, task]) => renderTask(taskId, task));
    completedTasks.forEach(([taskId, task]) => renderTask(taskId, task));

    // Применяем текущий фильтр
    applyFilter();
  }

  // Обновление счетчиков задач
  function updateTaskCounters() {
    const demoTeam = getDemoTeam();
    if (!demoTeam || !demoTeam.tasks) return;

    const tasks = Object.values(demoTeam.tasks);
    const activeTasksCount = tasks.filter((task) => !task.completed).length;
    const completedTasksCount = tasks.filter((task) => task.completed).length;

    document.getElementById("activeCount").textContent = activeTasksCount;
    document.getElementById("completedCount").textContent = completedTasksCount;
  }

  // Функция для получения названия сложности
  function getDifficultyName(level) {
    const names = {
      1: "Быстро",
      2: "Обычная",
      3: "Уделить время",
      4: "Разобраться",
    };
    return names[level] || "Не указана";
  }

  // Загружаем задачи при инициализации
  loadTasks();

  // Настраиваем кнопку перехода в личный кабинет
  const dashboardBtn = document.getElementById("dashboardBtn");
  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }
}

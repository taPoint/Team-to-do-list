firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }

  const currentTeam = localStorage.getItem("currentTeam");
  if (!currentTeam) {
    window.location.href = "dashboard.html";
    return;
  }

  // Fetch and display username
  fetchAndDisplayUsername(user);

  initApp(currentTeam);
});

// Function to fetch and display username
function fetchAndDisplayUsername(user) {
  const userNameElement = document.getElementById("userName");

  // Set loading state
  userNameElement.textContent = "Загрузка...";

  // Add timeout to handle network issues
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({ timedOut: true });
    }, 5000); // 5 second timeout
  });

  // First try to get username from database
  Promise.race([
    firebase.database().ref(`users/${user.uid}`).once("value"),
    timeoutPromise,
  ])
    .then((result) => {
      // Check if this was a timeout
      if (result.timedOut) {
        console.warn("Username fetch timed out, using fallback");
        throw new Error("Timeout fetching username");
      }

      const snapshot = result;
      const userData = snapshot.val();

      if (userData && userData.username) {
        // Display username if available
        userNameElement.textContent = userData.username;
        userNameElement.classList.add("has-username");
        userNameElement.classList.remove("no-username");
      } else {
        // Fall back to email if username is not available
        userNameElement.textContent = user.email;
        userNameElement.classList.add("no-username");
        userNameElement.classList.remove("has-username");
      }
    })
    .catch((error) => {
      console.error("Error fetching username:", error);
      // Fall back to email on error
      userNameElement.textContent = user.email;
      userNameElement.classList.add("no-username");
      userNameElement.classList.remove("has-username");
    });
}

function initApp(teamId) {
  document.getElementById("dashboardBtn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  const database = firebase.database();

  const TELEGRAM_TOKEN = "7925092628:AAF8PL_zjCwPhbTYqdsPbsmdCqyk5Wf05Cg";
  const CHAT_IDS = ["1512193467", "1330218782"];

  async function sendTelegramAlert(text, countInfo = null, gifUrl = null) {
    try {
      for (const chatId of CHAT_IDS) {
        let fullMessage = text;
        if (countInfo) {
          fullMessage += `\n\n📊 ${countInfo}`;
        }

        const response = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: fullMessage,
              parse_mode: "Markdown",
            }),
          }
        );
        if (gifUrl) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendAnimation`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                animation: gifUrl,
              }),
            }
          );
        }
        if (!response.ok) {
          console.error("Ошибка Telegram:", await response.text());
        }
      }
    } catch (error) {
      console.error("Ошибка отправки:", error);
    }
  }

  // Элементы DOM
  const taskTitleInput = document.getElementById("taskTitle");
  const taskDescInput = document.getElementById("taskDesc");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const activeTasksList = document.getElementById("activeTasks");
  const completedTasksList = document.getElementById("completedTasks");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const taskDifficultySelect = document.getElementById("taskDifficulty");

  taskDifficultySelect.addEventListener("change", function () {
    const value = this.value;
    this.className = `difficulty-select difficulty-${value}`;
  });
  taskDifficultySelect.className = `difficulty-select difficulty-${taskDifficultySelect.value}`;

  // Фильтрация задач
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
  addTaskBtn.addEventListener("click", async () => {
    const title = taskTitleInput.value.trim();
    const description = taskDescInput.value.trim();
    const difficulty = taskDifficultySelect.value;

    if (!title) {
      alert("Введите заголовок!");
      return;
    }

    try {
      const newTask = {
        title,
        description,
        difficulty: parseInt(difficulty),
        completed: false,
        createdAt: Date.now(),
        completedAt: null,
      };

      const taskRef = await database.ref(`teams/${teamId}/tasks`).push(newTask);

      // Get updated task count
      const snapshot = await database
        .ref(`teams/${teamId}/tasks`)
        .once("value");
      const tasks = snapshot.val() || {};
      const activeTasksCount = Object.values(tasks).filter(
        (t) => !t.completed
      ).length;

      const difficultyName = getDifficultyName(difficulty);
      const difficultyCircles = getDifficultyCircles(difficulty);
      const gifUrl = getCreationGif(difficulty);

      await sendTelegramAlert(
        `📚 *Новая задача!* 💵 \n\n` +
          `▫️ *${title}*\n` +
          `📌 ${description || "Без описания"}\n` +
          `⚡ Сложность: ${difficultyName} ${difficultyCircles}\n\n` +
          `📈 Добавлено: ${new Date().toLocaleString("ru-RU")}`,
        `Всего активных задач: ${activeTasksCount + 1}`,
        gifUrl
      );

      taskTitleInput.value = "";
      taskDescInput.value = "";
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка при добавлении задачи");
    }
  });

  // Отображение задач
  function renderTask(taskId, task) {
    const li = document.createElement("li");
    li.classList.add(`difficulty-${task.difficulty || 2}`); // По умолчанию "Обычная"
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
                    ? `<br>Выполнено: ${new Date(
                        task.completedAt
                      ).toLocaleString()}`
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

    const completeBtn = li.querySelector(".complete-btn");
    if (completeBtn) {
      completeBtn.addEventListener("click", async () => {
        await database.ref(`teams/${teamId}/tasks/${taskId}`).update({
          completed: true,
          completedAt: Date.now(),
        });

        const snapshot = await database
          .ref(`teams/${teamId}/tasks`)
          .once("value");
        const tasks = snapshot.val() || {};
        const completedTasksCount = Object.values(tasks).filter(
          (t) => t.completed
        ).length;
        const activeTasksCount = Object.values(tasks).filter(
          (t) => !t.completed
        ).length;

        const motivationalPhrases = [
          "Отличная работа! Продолжайте в том же духе!",
          "Еще одна задача выполнена! Так держать!",
          "Вы справляетесь просто великолепно!",
          "Продуктивность на высоте!",
          "Шаг за шагом к завершению всех задач!",
        ];
        const randomPhrase =
          motivationalPhrases[
            Math.floor(Math.random() * motivationalPhrases.length)
          ];

        const difficultyName = getDifficultyName(task.difficulty);
        const difficultyCircles = getDifficultyCircles(task.difficulty);
        const gifUrl = getDifficultyGif(task.difficulty);

        await sendTelegramAlert(
          `✅ *ЗАДАЧА ВЫПОЛНЕНА!* ✅\n\n` +
            `▫️ *${task.title}*\n` +
            `⚡ Сложность: ${difficultyName} ${difficultyCircles}\n\n` +
            `⏱ ${new Date().toLocaleString("ru-RU")}\n\n` +
            `${randomPhrase}`,
          `Выполнено задач: ${completedTasksCount}\nОсталось активных: ${activeTasksCount}`,
          gifUrl
        );
      });
    }

    const reopenBtn = li.querySelector(".reopen-btn");
    if (reopenBtn) {
      reopenBtn.addEventListener("click", () => {
        database.ref(`teams/${teamId}/tasks/${taskId}`).update({
          completed: false,
          completedAt: null,
        });
      });
    }

    const editBtn = li.querySelector(".edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", () => enterEditMode(li, taskId, task));
    }

    li.querySelector(".delete-btn").addEventListener("click", () => {
      if (confirm("Удалить задачу?")) {
        database.ref(`teams/${teamId}/tasks/${taskId}`).remove();
      }
    });

    if (task.completed) {
      completedTasksList.appendChild(li);
    } else {
      activeTasksList.appendChild(li);
    }

    applyFilter();
  }

  // Режим редактирования
  function enterEditMode(li, taskId, task) {
    li.classList.add("edit-mode");

    const titleElement = li.querySelector(".task-title");
    const descElement = li.querySelector(".task-desc");
    const difficultyElement = li.querySelector(".task-difficulty");
    const actionsElement = li.querySelector(".task-actions");
    const originalTitle = titleElement.textContent;
    const originalDesc = descElement.textContent;
    const originalDifficulty = task.difficulty;

    // Заменяем содержимое
    titleElement.innerHTML = `<input type="text" class="edit-input" value="${originalTitle}">`;
    descElement.innerHTML = `<textarea class="edit-input">${
      originalDesc === "—" ? "" : originalDesc
    }</textarea>`;

    // Добавляем выбор сложности
    difficultyElement.innerHTML = `
            <select class="edit-difficulty-select">
                <option value="1" ${
                  originalDifficulty === 1 ? "selected" : ""
                }>Быстро</option>
                <option value="2" ${
                  originalDifficulty === 2 ? "selected" : ""
                }>Обычная</option>
                <option value="3" ${
                  originalDifficulty === 3 ? "selected" : ""
                }>Уделить время</option>
                <option value="4" ${
                  originalDifficulty === 4 ? "selected" : ""
                }>Разобраться</option>
            </select>
        `;

    // Применяем стиль к селекту
    const select = difficultyElement.querySelector(".edit-difficulty-select");
    select.className = `edit-difficulty-select difficulty-${originalDifficulty}`;
    select.addEventListener("change", function () {
      this.className = `edit-difficulty-select difficulty-${this.value}`;
    });

    // Заменяем кнопки действий на кнопки сохранения/отмены
    actionsElement.innerHTML = `
            <div class="save-cancel-btns">
                <button class="save-btn" data-id="${taskId}">Сохранить</button>
                <button class="cancel-btn">Отмена</button>
            </div>
        `;

    // Обработчики для новых кнопок
    actionsElement.querySelector(".save-btn").addEventListener("click", () => {
      const newTitle = li.querySelector(".edit-input").value.trim();
      const newDesc = li.querySelector("textarea.edit-input").value.trim();
      const newDifficulty = parseInt(
        li.querySelector(".edit-difficulty-select").value
      );

      if (!newTitle) {
        alert("Заголовок не может быть пустым!");
        return;
      }

      database.ref(`teams/${teamId}/tasks/${taskId}`).update({
        title: newTitle,
        description: newDesc || "—",
        difficulty: newDifficulty,
      });
    });

    actionsElement
      .querySelector(".cancel-btn")
      .addEventListener("click", () => {
        exitEditMode(li, originalTitle, originalDesc, taskId, task);
      });
  }

  function getDifficultyName(level) {
    const names = {
      1: "Быстро",
      2: "Обычная",
      3: "Уделить время",
      4: "Разобраться",
    };
    return names[level] || "Не указана";
  }

  function getDifficultyCircles(level) {
    const colors = {
      1: "❇️", // Быстро - зеленый
      2: "✳️ ", // Обычная - зелёный
      3: "🟡", // Уделить время - желтый
      4: "🟣🟠", // Разобраться - фиолетовый
    };
    return colors[level] || "⚪"; // Белый по умолчанию
  }

  function getDifficultyGif(level) {
    const gifs = {
      1: "https://media1.tenor.com/m/DIyOTSDWQsIAAAAC/done-cool.gif",
      2: "https://media1.tenor.com/m/NVaq6kvf8iAAAAAd/hedgehog-%D1%91%D0%B6.gif",
      3: "https://media1.tenor.com/m/xQXMYIcJJUkAAAAd/slap-in-the-face-%D1%81%D1%8A%D0%B5%D0%B1%D0%B0%D0%BB%D0%BE%D1%81%D1%8C-%D1%87%D1%83%D0%B4%D0%B8%D1%89%D0%B5.gif",
      4: "https://media1.tenor.com/m/LVrDfWYdoboAAAAd/lit-baby.gif",
    };
    return gifs[level] || null;
  }

  function getCreationGif(level) {
    const gifs = {
      1: "https://media.tenor.com/Ag9e2BGsRGUAAAAC/lets-go.gif",
      2: "https://media1.tenor.com/m/CJrNglnkKUgAAAAd/banny-%D1%85%D0%B0%D1%80%D0%BE%D1%88.gif",
      3: "https://media1.tenor.com/m/qBS2B5Zdd8cAAAAC/ae.gif",
      4: "https://media1.tenor.com/m/2fqGtk-1AKYAAAAd/%D1%82%D1%80%D0%B8-%D0%B1%D0%BE%D0%B3%D0%B0%D1%82%D1%8B%D1%80%D1%8F-%D0%BC%D0%B5%D0%BC.gif",
    };
    return gifs[level] || null;
  }

  // Выход из режима редактирования
  function exitEditMode(li, title, description, taskId, task) {
    li.classList.remove("edit-mode");

    const titleElement = li.querySelector(".task-title");
    const descElement = li.querySelector(".task-desc");
    const difficultyElement = li.querySelector(".task-difficulty");
    const actionsElement = li.querySelector(".task-actions");

    // Восстанавливаем оригинальное содержимое
    titleElement.textContent = title;
    descElement.textContent = description === "—" ? "—" : description;
    difficultyElement.textContent = getDifficultyName(task.difficulty);

    // Обновляем класс сложности
    li.className = `difficulty-${task.difficulty || 2}`;
    if (task.completed) li.classList.add("completed");

    // Восстанавливаем оригинальные кнопки
    actionsElement.innerHTML = `
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
        `;

    // Назначаем обработчики
    const completeBtn = li.querySelector(".complete-btn");
    if (completeBtn) {
      completeBtn.addEventListener("click", () => {
        database.ref(`teams/${teamId}/tasks/${taskId}`).update({
          completed: true,
          completedAt: Date.now(),
        });
      });
    }

    const reopenBtn = li.querySelector(".reopen-btn");
    if (reopenBtn) {
      reopenBtn.addEventListener("click", () => {
        database.ref(`teams/${teamId}/tasks/${taskId}`).update({
          completed: false,
          completedAt: null,
        });
      });
    }

    const editBtn = li.querySelector(".edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", () => enterEditMode(li, taskId, task));
    }

    li.querySelector(".delete-btn").addEventListener("click", () => {
      if (confirm("Удалить задачу?")) {
        database.ref(`teams/${teamId}/tasks/${taskId}`).remove();
      }
    });
  }

  // Загрузка и обновление задач
  database.ref(`teams/${teamId}/tasks`).on("value", (snapshot) => {
    activeTasksList.innerHTML = "";
    completedTasksList.innerHTML = "";

    const tasks = snapshot.val();
    if (!tasks) return;

    // Преобразуем объект в массив
    const tasksArray = Object.entries(tasks);

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
    completedTasks.sort((a, b) => b[1].completedAt - a[1].completedAt);

    // Отображаем задачи
    activeTasks.forEach(([taskId, task]) => renderTask(taskId, task));
    completedTasks.forEach(([taskId, task]) => renderTask(taskId, task));
  });

  // Проверка соединения
  database.ref(".info/connected").on("value", (snap) => {
    console.log(snap.val() ? "Online" : "Offline");
  });
}

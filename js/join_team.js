// Функция для присоединения к проекту напрямую
function joinTeam(teamId, password, userId) {
  return new Promise((resolve, reject) => {
    console.log("Начинаем процесс присоединения к проекту:", teamId);

    // Проверяем существование проекта и пароль напрямую
    // Это обходной путь, который работает с текущими правами доступа

    // Создаем временный объект для хранения данных проекта
    let teamData = null;

    // Получаем список всех проектов
    firebase
      .database()
      .ref("teams")
      .once("value")
      .then((snapshot) => {
        const teams = snapshot.val() || {};

        // Проверяем, существует ли проект с таким ID
        if (!teams[teamId]) {
          throw new Error("Проект с таким ID не найден");
        }

        teamData = teams[teamId];

        // Проверяем пароль
        if (teamData.password !== password) {
          throw new Error("Неверный пароль проекта");
        }

        // Если пароль верный, добавляем пользователя в проект
        return firebase
          .database()
          .ref(`teams/${teamId}/members/${userId}`)
          .set(true);
      })
      .then(() => {
        console.log("Пользователь успешно добавлен в проект");

        // Возвращаем данные о проекте
        resolve({
          teamId: teamId,
          teamName: teamData.name || teamId,
          status: "approved",
        });
      })
      .catch((error) => {
        console.error("Ошибка при присоединении к проекту:", error);
        reject(error);
      });
  });
}

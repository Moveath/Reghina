/*
 * ВСТУПИТЕЛЬНЫЕ ДИАЛОГИ ПЕРСОНАЖА (собака Кане-корсо).
 *
 * Каждая реплика — объект:
 *   {
 *     type: "speech" | "thought" | "choice" | "name_input",
 *     text: "текст реплики",
 *     emotion: "sleeping" | "groggy" | "happy" | "thinking" | "neutral",
 *     choices: [{label: "...", next: index}] (только для choice),
 *     isEnding: true (завершает интро),
 *     isDream: true (первый сон)
 *   }
 */

const introDialogueLines = [

    /* ===== Диалог 1 (thought — сон, спящая) ===== */
    {
        type: "thought",
        text: "Хррр... Егор, я же сказал, что буду охранять это место завтра...",
        emotion: "sleeping",
        isDream: true
    },

    /* ===== Диалог 2 (speech — сонная) ===== */
    {
        type: "speech",
        text: "Ааа...? Мм...? Кто здесь?",
        emotion: "sleepy"
    },

    /* ===== Диалог 3 (speech — растерянность) ===== */
    {
        type: "speech",
        text: "Подожди... Кажется я тебя знаю. Ааа это ты. Привет, Регина. ✨",
        emotion: "confused"
    },

    /* ===== Диалог 4 (speech — растерянность) ===== */
    {
        type: "speech",
        text: "Меня оставили здесь встречать тебя. Если честно, я сам не до конца понимаю, что именно происходит, но перед тем как уйти, Егор попросил меня кое о чём. Он сказал: «Когда она придёт, обязательно встреть её.» Так что... вот я здесь.",
        emotion: "confused"
    },

    /* ===== Диалог 5 (speech — счастье) ===== */
    {
        type: "speech",
        text: "Егор рассказал мне совсем немного. По его словам, это место создавалось для одного особенного человека. И, насколько я понял... этот человек сейчас смотрит на экран.Он также просил передать тебе, что ты далеко не безразлична ему",
        emotion: "happy"
    },


    /* ===== Диалог 6 (thought — растерянность) ===== */
    {
        type: "thought",
        text: "Хмм... Мне кажется она ему нравится...",
        emotion: "confused"
    },

    /* ===== Диалог 7 (speech — растерянность) ===== */
    {
        type: "speech",
        text: "А?.. Прости, кажется я немного отвлекся. Иногда я слишком много витаю в своих мыслях. Так... На чём я остановился?",
        emotion: "confused"
    },

    /* ===== Диалог 8 (choice — нейтральная) ===== */
    {
        type: "choice",
        text: "Ах да. Егор просил меня задать тебе один важный вопрос. Возможно, ты ещё не до конца понимаешь, что вообще происходит и зачем было создано это место. Но я точно знаю всё, что находится дальше, появилось здесь не случайно. Поэтому дальнейший путь зависит только от тебя. Я не буду тебя торопить и не стану убеждать. Но если тебе хоть немного интересно узнать, что будет дальше то можешь продолжить. Что скажешь? Хочешь продолжить?",
        emotion: "neutral",
        choices: [
            { label: "Да, хочу", next:  9},
            { label: "Пока нет", next: 8 }
        ]
    },

    /* ===== Диалог 9 (speech — грустная) =====
       Ветка «Пока нет». Дальше не идём по основной линии —
       переходим к прощальному диалогу-ответвлению в конце массива. */
    {
        type: "speech",
        text: "Понимаю. Наверное, для тебя это действительно выглядит немного странно. В этом нет ничего плохого. Тогда я не стану тебя задерживать. Но если однажды тебе станет любопытно... Я всё ещё буду ждать здесь.",
        emotion: "sad",
        next: 47
    },

    /* ===== Диалог 10 (speech — веселье/счастливая) ===== */
    {
        type: "speech",
        text: "Супер. Тогда давай начнём небольшое путешествие.",
        emotion: "happy"
    },

    /* ===== Диалог 11 (speech — нейтральная) ===== */
    {
        type: "speech",
        text: "Кстати... перед тем как начать, я ведь так и не представился. Только вот есть одна проблема. Кажется, Егор забыл придумать мне имя.",
        emotion: "neutral"
    },

    /* ===== Диалог 12 (thought — растерянность) ===== */
    {
        type: "thought",
        text: "Как он мог забыть...",
        emotion: "confused"
    },

    /* ===== Диалог 13 (name_input — нейтральная) ===== */
    {
        type: "name_input",
        text: "Я думаю, он хотел доверить этот выбор тебе. Как ты хочешь меня назвать?",
        emotion: "neutral"
    },

    /* ===== Диалог 14 (speech — счастье) ===== */
    {
        type: "speech",
        text: "«имя»? Мне нравится. Намного лучше, чем мой прошлый вариант.",
        emotion: "happy"
    },

    /* ===== Диалог 15 (speech — счастье) ===== */
    {
        type: "speech",
        text: "Ну что ж. Тогда позволь показать тебе это место. Кажется, впереди будет что-то интересное.",
        emotion: "happy"
    },

    /* ===== Диалог 16 (speech — нейтральная) ===== */
    {
        type: "speech",
        text: "Не переживай. Тут всё гораздо проще, чем выглядит.",
        emotion: "neutral",
        showOverlay: true
    },

/* ===== Диалог 17 (speech — нейтральная) ===== */
    {
        type: "speech",
        text: "Начнём отсюда. Это настройки. Именно здесь прячутся все полезные штуки.",
        emotion: "neutral",
        waitForClick: "settingsButton",
        hintText: "нажми на иконку настроек, чтобы продолжить"
    },

    /* ===== Диалог 18 (speech — нейтральная) =====
       Ждём клика по виджету «Темы». Клик по нему не завершает диалог сразу —
       открывает отдельное меню выбора темы (см. opensThemeMenu в dialogue.js). */
    {
        type: "speech",
        text: "Например, темы. Если однажды тебе надоест текущий вид сайта, можешь всё поменять буквально за пару секунд.Кажется, Егор слишком долго выбирал цвета для этого места.Можешь попробовать",
        emotion: "neutral",
        waitForClick: "themesOption",
        hintText: "Нажми на кнопку темы",
        opensThemeMenu: true
    },

    /* ===== Диалог 19 (speech — счастливая) =====
       Достигается только после реального выбора темы в новом меню
       (клик по варианту темы вызывает handleThemeSelected()). */
    {
        type: "speech",
        text: "Вау, смотри как всё преобразилось, правда красиво? Хорошо, давай пойдем дальше.",
        emotion: "happy"
    },

    /* ===== Диалог 20 (speech — нейтральная) =====
       Подсвечивается виджет «Звуки» внутри настроек. */
    {
        type: "speech",
        text: "Здесь ты можешь отключить все звуки в игре, но музыка останется.",
        emotion: "neutral",
        highlightTarget: "soundsOption"
    },

    /* ===== Диалог 21 (speech — нейтральная) =====
       Подсвечивается виджет «Язык» внутри настроек. */
    {
        type: "speech",
        text: "Здесь ты можешь поменять язык, а я попробую всё здесь перевести для тебя на выбранном языке.",
        emotion: "neutral",
        highlightTarget: "languageOption"
    },

    /* ===== Диалог 22 (speech — нейтральная) =====
       Переход к музыкальной шкатулке. Закрываем настройки и ждём клика
       по виджету музыкальной шкатулки — остальные виджеты в это время скрыты. */
    {
        type: "speech",
        text: "Идём дальше. Смотри — вот музыкальная шкатулка. Из неё звучит вся музыка этого места.",
        emotion: "neutral",
        waitForClick: "musicBoxButton",
        hintText: "нажми на музыкальную шкатулку",
        closeSettingsPanel: true
    },

    /* ===== Диалог 23 (speech — нейтральная) =====
       Внутри шкатулки подсвечивается виджет «Музыка». */
    {
        type: "speech",
        text: "Ты можешь отключить всю музыку, тогда ничего не будет слышно, но звуки останутся.",
        emotion: "neutral",
        highlightTarget: "musicWidgetOption"
    },

    /* ===== Диалог 24 (speech — счастливая) =====
       Подсвечивается виджет «Добавить песню». */
    {
        type: "speech",
        text: "Егор сказал, что ты можешь добавить свою песню, и потом он попытается её добавить. В будущем ты сможешь выбирать её, чтобы играла именно она.",
        emotion: "happy",
        highlightTarget: "addSongOption"
    },

    /* ===== Диалог 25 (speech — растерянная) =====
       Подсвечивается виджет «Список музыки». */
    {
        type: "speech",
        text: "Правда Егор сказал, что пока не знает, какая твоя любимая песня, и я решил оставить стандартную...",
        emotion: "confused",
        highlightTarget: "musicListOption"
    },

    /* ===== Диалог 26 (speech — нейтральная) =====
       Переход к виджету «Прогресс». Закрываем шкатулку и ждём клика по прогрессу. */
    {
        type: "speech",
        text: "Это хоть и скучная, но важная часть — прогресс.",
        emotion: "neutral",
        waitForClick: "progressButton",
        hintText: "нажми на прогресс",
        closeSettingsPanel: true
    },

    /* ===== Диалог 27 (speech — нейтральная) =====
       Подсвечивается «Показать код» внутри прогресса. */
    {
        type: "speech",
        text: "Если вдруг ты захочешь зайти с другого устройства, то твой нынешний прогресс не сохранится. Поэтому и нужен этот код — при его вводе твой прогресс вернётся даже на новом устройстве.",
        emotion: "neutral",
        highlightTarget: "showCodeOption"
    },

    /* ===== Диалог 28 (speech — нейтральная) =====
       Подсвечивается «Ввести код» внутри прогресса. */
    {
        type: "speech",
        text: "Как раз так — сюда нужно будет ввести код, чтобы вернуть прогресс.",
        emotion: "neutral",
        highlightTarget: "enterCodeOption"
    },

    /* ===== Диалог 29 (speech — нейтральная) =====
       Подсвечивается «Сбросить прогресс» внутри прогресса. */
    {
        type: "speech",
        text: "А эту кнопку я бы не нажимал, если ты, конечно, не хочешь потерять весь прогресс.",
        emotion: "neutral",
        highlightTarget: "resetProgressOption"
    },

    /* ===== Диалог 30 (speech — нейтральная) =====
       Переход к виджету «О проекте». Просто показываем виджет — внутрь
       не проваливаемся, отдельных диалогов по его пунктам нет. */
    {
        type: "speech",
        text: "Здесь хранится вся информация о сайте, если тебе будет интересно посмотреть.",
        emotion: "neutral",
        highlightTarget: "aboutButton",
        closeSettingsPanel: true
    },

    /* ===== Диалог 31 (speech — нейтральная) =====
       Переход к иконке «Письма» (объединяет бывшие «Чат» и «Уведомления» —
       это не мессенджер, а почта: собака относит письма Регины Егору и
       приносит его ответы). Закрываем «О проекте», если он был открыт. */
    {
        type: "speech",
        text: "Здесь у нас с тобой почта. Можешь написать что-нибудь Егору, а я обязательно всё передам, чтобы он прочитал. И точно так же сюда будут приходить письма от него самого.",
        emotion: "neutral",
        highlightTarget: "lettersButton",
        closeSettingsPanel: true
    },

    /* ===== Диалог 32 (speech — растерянная) =====
       В этот момент на иконке писем загорается непрочитанное (см.
       showNotificationBadge). Клик по "Письма" открывает настоящий виджет,
       но сценарий НЕ идёт дальше сам по себе (pauseForLetterRead) — реплика
       остаётся висеть, пока Регина реально не откроет "Входящие" и не
       прочитает письмо (см. window.notifyLetterRead в dialogue.js, дёргается
       из js/ui/letters.js). bubbleAtTop уводит пузырь вправо-вверх, чтобы
       не перекрывать виджет писем — он открывается по центру экрана. */
    {
        type: "speech",
        text: "Смотри! Кажется, Егор написал тебе что-то. Давай прочитаем.",
        emotion: "confused",
        waitForClick: "lettersButton",
        hintText: "нажми на письма",
        showNotificationBadge: true,
        pauseForLetterRead: true,
        bubbleAtTop: true
    },

    /* ===== Диалог 34 (speech — счастливая) =====
       Переход к «О персонаже». */
    {
        type: "speech",
        text: "А здесь, кажется, написано про меня — можешь почитать как-нибудь потом.",
        emotion: "happy",
        highlightTarget: "characterInfoButton"
    },

    /* ===== Диалог 35 (speech — счастливая) =====
       Переход к кнопке «Имя персонажа» — в будущем по ней (или по самому
       персонажу) собака будет выходить из угла и предлагать помощь,
       но пока это не реализовано, только подсказка в диалоге. */
    {
        type: "speech",
        text: "Можешь нажимать на эту кнопку, если понадобится моя помощь, или непосредственно на меня.",
        emotion: "happy",
        highlightTarget: "dogNameButton",
        closeSettingsPanel: true
    },

    /* ===== Диалог 36 (speech — счастливая) =====
       Переход к «Дневнику». */
    {
        type: "speech",
        text: "А это мой дневник, сюда я записываю все свои мысли каждый день.",
        emotion: "happy",
        highlightTarget: "diaryButton"
    },

    /* ===== Диалог 37 (speech — растерянная/задумчивая) ===== */
    {
        type: "speech",
        text: "Только не говори Егору о нём — он о нём не знает, это секрет. Но тебе можно смотреть, что я оставляю там.",
        emotion: "confused",
        highlightTarget: "diaryButton"
    },

    /* ===== Диалог 38 (speech — нейтральная) =====
       Центральный пазл переезжает из угла в центр экрана (см. expandPuzzle
       в dialogue.js). */
    {
        type: "speech",
        text: "А это, пожалуй, самая интересная часть этого места. Именно ради этого всё создавалось.",
        emotion: "neutral",
        expandPuzzle: true,
        bubbleAtTop: true
    },

    /* ===== Диалог 39 (speech — растерянная) ===== */
    {
        type: "speech",
        text: "Честно говоря, я сам пока не знаю, что это и что там находится. Но Егор сказал, что чтобы открыть это, нужно ровно 4 ключа.",
        emotion: "confused",
        bubbleAtTop: true
    },

    /* ===== Диалог 40 (speech — счастливая) =====
       Ключ пока НЕ выдаём — тизер без реального появления в инвентаре. */
    {
        type: "speech",
        text: "К счастью, у меня кое-что есть для тебя...",
        emotion: "happy",
        bubbleAtTop: true
    },

    /* ===== Диалог 41 (speech — с ключом в лапах) =====
       Ждём клика по собаке. Именно в момент клика (grantKeyOnClick) —
       не раньше — ключ реально появляется в инвентаре, эмоция на месте
       меняется на счастливую (текст не трогаем), берём ключ в руку
       (selectsKey) и ставим сценарий на паузу (pauseForPuzzleUnlock) до тех
       пор, пока пользователь сама не откроет кусочек пазла ключом. */
    {
        type: "speech",
        text: "Ключ... Я недавно нашёл его, думаю, этот ключ как раз нужен именно для этого. Давай попробуем открыть одну из частей.",
        emotion: "withKey",
        waitForClick: "dogCharacter",
        hintText: "Чтобы взять ключ у «имя», нажми на него",
        grantKeyOnClick: true,
        selectsKey: true,
        pauseForPuzzleUnlock: true,
        bubbleAtTop: true
    },

    /* ===== Диалог 42 (speech — счастливая) =====
       Достигается не кликом, а событием реального открытия кусочка пазла
       (см. window.notifyPuzzlePieceUnlocked / resumeIntroAfterPuzzleUnlock). */
    {
        type: "speech",
        text: "ВААУ, смотри, кажется одна из частей открылась...",
        emotion: "happy",
        bubbleAtTop: true
    },

    /* ===== Диалог 43 (speech — растерянная/задумчивая) ===== */
    {
        type: "speech",
        text: "Честно говоря, я сам не знаю, что будет, если открыть все 4 части. Думаю, ты обязательно это узнаешь, как только откроешь их все.",
        emotion: "confused",
        bubbleAtTop: true
    },

    /* ===== Диалог 44 (speech — счастливая) ===== */
    {
        type: "speech",
        text: "Смотри, осталось ещё 3 части и нужно 3 ключа. К сожалению, у меня больше ключей нет, но как только я найду ключ, я обязательно тебе принесу его.",
        emotion: "happy",
        bubbleAtTop: true
    },

    /* ===== Диалог 45 (speech — счастливая) =====
       Про сворачивание/разворачивание пазла — подсвечиваем кнопку "✕"
       на самом пазле. */
    {
        type: "speech",
        text: "Можешь открывать и закрывать этот пазл, и он будет принимать разные положения — сможешь расположить его в углу или в центре.",
        emotion: "happy",
        highlightTarget: "toggleContainer",
        bubbleAtTop: true
    },

    /* ===== Диалог 46 (speech — нейтральная) =====
       Про индикатор ключей. */
    {
        type: "speech",
        text: "Также здесь есть индикатор, который показывает, сколько у тебя сейчас ключей есть — как видишь, сейчас ключей нет.",
        emotion: "neutral",
        highlightTarget: "keyCounter",
        bubbleAtTop: true
    },

    /* ===== Диалог 47 (speech — счастливая) =====
       Последний диалог основной линии — завершает интро. Подсвечиваем
       (мигаем) виджет с именем собаки — напоминание, что за помощью можно
       обращаться к нему в любой момент. */
    {
        type: "speech",
        text: "Пока всё, вроде я всё показал. Если понадобится моя помощь, можешь нажимать на меня или на мою иконку.",
        emotion: "happy",
        highlightTarget: "dogNameButton",
        bubbleAtTop: true,
        isEnding: true
    },

    /* ===== Прощальный диалог-ответвление (после Диалога 9, ветка «Пока нет») =====
       Не часть основной нумерованной линии — сюда переходят только через next:47
       из Диалога 9. После клика здесь всё полностью замирает (см. freezeAfter). */
    {
        type: "speech",
        text: "Если ты захочешь сюда вернуться, то я буду тебя здесь ждать.",
        emotion: "sad",
        keepOverlay: true,
        freezeAfter: true
    }

];

// Параллельные массивы текста реплик интро — тот же порядок и длина
// (47), что и introDialogueLines выше. Только текст, все остальные поля
// (emotion/choices/next/...) берутся из оригинального массива без изменений.
window.dialogueTranslations = {
    en: [
        "Zzz... Egor, I already told you I'd guard this place tomorrow...",
        "Aaah...? Mm...? Who's there?",
        "Wait... I think I know you. Ah, it's you. Hi, Regina. ✨",
        "I was left here to meet you. Honestly, I don't fully understand what's going on myself, but before he left, Egor asked me for something. Something like: when she comes, be sure to greet her properly. So... here I am.",
        "Egor didn't tell me much. From what he said, this place was made for one special person. And, as far as I can tell... that person is looking at the screen right now. He also asked me to tell you that you mean a lot to him.",
        "Hmm... I think she likes him...",
        "Huh?.. Sorry, I think I got a bit distracted. Sometimes I drift off into my own thoughts too much. So... where was I?",
        "Ah right. Egor asked me to ask you one important question. You probably don't fully understand yet what's going on or why this place was made. But I do know for sure that everything further along didn't appear here by accident. So what happens next is entirely up to you. I won't rush you, and I won't try to convince you. But if you're even a little curious to find out what comes next, you can continue. What do you say? Do you want to continue?",
        "I understand. It probably does seem a bit strange to you. There's nothing wrong with that. Then I won't keep you. But if one day you get curious... I'll still be waiting here.",
        "Great. Then let's start a little journey.",
        "By the way... before we begin, I never actually introduced myself. There's just one problem. It seems Egor forgot to give me a name.",
        "How could he forget...",
        "I think he wanted to leave that choice to you. What would you like to call me?",
        "«имя»? I like it. Much better than my old placeholder.",
        "Well then. Let me show you around this place. I have a feeling something interesting is coming up.",
        "Don't worry. It's all much simpler than it looks.",
        "Let's start here. This is the settings. This is exactly where all the useful stuff is hiding.",
        "For example, themes. If you ever get tired of the site's current look, you can change everything in just a couple of seconds. It seems Egor spent way too long picking colors for this place. Give it a try.",
        "Wow, look how everything changed, isn't it pretty? Okay, let's keep going.",
        "Here you can turn off all the sound effects in the game, but the music will stay on.",
        "Here you can change the language, and I'll try to translate everything here for you in the language you choose.",
        "Let's keep going. Look — this is the music box. All the music around here comes from it.",
        "You can turn off all the music, so nothing will play, but the sound effects will stay.",
        "Egor said you can add your own song, and later he'll try to add it. In the future you'll be able to pick it so it plays specifically.",
        "Egor actually said he doesn't know your favorite song yet, so I decided to leave the default one for now...",
        "This part is a bit boring, but important — progress.",
        "If you ever open this on another device, your current progress won't carry over on its own. That's exactly why this code exists — enter it, and your progress comes back, even on a brand new device.",
        "Exactly like that — this is where you'd enter the code to bring your progress back.",
        "And this button... I wouldn't press it, unless of course you want to lose all your progress.",
        "This is where all the information about the site is kept, in case you're curious to look sometime.",
        "This is our mailbox. You can write something to Egor, and I'll make sure he reads it. And the same way, his replies will show up here too.",
        "Look! Looks like Egor wrote you something. Let's go read it.",
        "And here, I think, is something written about me — you can read it sometime later.",
        "You can tap this button whenever you need my help, or just tap me directly.",
        "And this is my diary — I write down all my thoughts here every day.",
        "Just don't tell Egor about it — he doesn't know it exists, it's a secret. But you're allowed to see what I write in there.",
        "And this, I'd say, is the most interesting part of this whole place. It's really what all of this was made for.",
        "Honestly, I still don't know myself what this is or what's inside. But Egor said you need exactly 4 keys to open it.",
        "Luckily, I happen to have something for you...",
        "A key... I found it recently, and I think it's exactly the one needed for this. Let's try opening one of the pieces.",
        "WOW, look, it seems like one of the pieces just opened...",
        "Honestly, I don't know myself what happens once all 4 pieces are open. I'm sure you'll find out the moment you open all of them.",
        "Look, there are 3 pieces left, and you'll need 3 more keys. Unfortunately I don't have any more keys right now, but as soon as I find one, I'll bring it straight to you.",
        "You can open and close this puzzle, and it'll take different positions — you can place it in the corner or in the center.",
        "There's also an indicator here that shows how many keys you currently have — as you can see, right now you have none.",
        "That's everything for now, I think I've shown you it all. If you ever need my help, just tap me or my icon.",
        "If you ever want to come back here, I'll be waiting for you."
    ],
    ro: [
        "Zzz... Egor, ți-am spus doar că voi păzi locul ăsta mâine...",
        "Aaa...? Mm...? Cine e acolo?",
        "Stai puțin... Parcă te cunosc. Aaa, tu ești. Salut, Regina. ✨",
        "Am fost lăsat aici ca să te întâmpin. Sincer, nici eu nu înțeleg pe deplin ce se întâmplă, dar înainte să plece, Egor m-a rugat ceva. Ceva de genul: când vine ea, s-o întâmpini neapărat cum se cuvine. Așa că... iată-mă aici.",
        "Egor mi-a povestit foarte puțin. După spusele lui, locul ăsta a fost creat pentru o persoană specială. Și, din câte îmi dau seama... persoana aceea se uită acum la ecran. Mi-a mai zis să-ți spun că îi pasă enorm de tine.",
        "Hmm... Cred că îi place de el...",
        "A?.. Scuze, parcă m-am pierdut puțin cu gândul. Uneori mă pierd prea mult în propriile gânduri. Deci... unde rămăsesem?",
        "Ah, da. Egor m-a rugat să-ți pun o întrebare importantă. Poate că încă nu înțelegi pe deplin ce se întâmplă și de ce a fost creat locul ăsta. Dar știu sigur că tot ce urmează nu a apărut aici din întâmplare. Așa că drumul mai departe depinde doar de tine. N-o să te grăbesc și n-o să te conving. Dar dacă ești măcar puțin curioasă să afli ce urmează, poți continua. Ce zici? Vrei să continui?",
        "Înțeleg. Probabil ți se pare puțin ciudat. Nu e nimic în neregulă cu asta. Atunci n-o să te mai rețin. Dar dacă într-o zi devii curioasă... o să te aștept tot aici.",
        "Super. Atunci hai să începem o mică călătorie.",
        "Apropo... înainte să începem, nu m-am prezentat de fapt. Doar că e o problemă. Se pare că Egor a uitat să-mi dea un nume.",
        "Cum a putut să uite...",
        "Cred că a vrut să-ți lase ție alegerea asta. Cum vrei să-mi spui?",
        "«имя»? Îmi place. Mult mai bine decât varianta mea de dinainte.",
        "Ei bine. Atunci dă-mi voie să-ți arăt locul ăsta. Simt că urmează ceva interesant.",
        "Nu-ți face griji. Aici totul e mult mai simplu decât pare.",
        "Să începem de aici. Astea sunt setările. Chiar aici se ascund toate lucrurile utile.",
        "De exemplu, temele. Dacă într-o zi te plictisești de aspectul actual al site-ului, poți schimba totul în doar câteva secunde. Parcă Egor a stat prea mult să aleagă culorile pentru locul ăsta. Poți încerca.",
        "Uau, uite cum s-a schimbat totul, nu-i așa că e frumos? Bine, hai să mergem mai departe.",
        "Aici poți opri toate sunetele din joc, dar muzica va rămâne.",
        "Aici poți schimba limba, iar eu voi încerca să traduc totul aici pentru tine, în limba aleasă.",
        "Hai mai departe. Uite — asta e cutia muzicală. Din ea răsună toată muzica locului ăsta.",
        "Poți opri toată muzica, atunci nu se va mai auzi nimic, dar sunetele vor rămâne.",
        "Egor a spus că poți adăuga propria ta melodie, iar apoi el va încerca s-o adauge. Pe viitor vei putea s-o alegi, ca să cânte exact ea.",
        "Ce-i drept, Egor a spus că deocamdată nu știe care e melodia ta preferată, așa că am decis să las una standard...",
        "E o parte cam plictisitoare, dar importantă — progresul.",
        "Dacă vreodată intri de pe alt dispozitiv, progresul tău actual nu se va păstra de la sine. De aceea există codul ăsta — la introducerea lui, progresul tău revine chiar și pe un dispozitiv nou.",
        "Exact așa — aici va trebui să introduci codul ca să-ți recuperezi progresul.",
        "Iar butonul ăsta... eu nu l-aș apăsa, decât dacă vrei să pierzi tot progresul, bineînțeles.",
        "Aici e păstrată toată informația despre site, dacă vrei să te uiți vreodată.",
        "Aici avem poșta noastră. Poți să-i scrii ceva lui Egor, iar eu mă asigur că o citește. Și tot așa, aici vor apărea și răspunsurile lui.",
        "Uite! Se pare că Egor ți-a scris ceva. Hai să citim.",
        "Iar aici, cred, scrie despre mine — poți citi cândva mai târziu.",
        "Poți apăsa pe butonul ăsta oricând ai nevoie de ajutorul meu, sau direct pe mine.",
        "Iar acesta e jurnalul meu, aici îmi notez toate gândurile în fiecare zi.",
        "Doar să nu-i spui lui Egor despre el — el nu știe de el, e un secret. Dar tu poți vedea ce las acolo.",
        "Iar asta, aș zice, e cea mai interesantă parte a locului ăsta. Practic pentru asta a fost creat totul.",
        "Sincer, nici eu nu știu încă ce e asta sau ce se află înăuntru. Dar Egor a spus că îți trebuie exact 4 chei ca să deschizi asta.",
        "Din fericire, am ceva pentru tine...",
        "O cheie... Am găsit-o de curând, cred că exact de ea e nevoie aici. Hai să încercăm să deschidem una dintre părți.",
        "UAU, uite, parcă tocmai s-a deschis una dintre părți...",
        "Sincer, nici eu nu știu ce se întâmplă dacă deschizi toate cele 4 părți. Cred că vei afla sigur imediat ce le deschizi pe toate.",
        "Uite, au mai rămas 3 părți și mai ai nevoie de 3 chei. Din păcate, nu mai am alte chei acum, dar imediat ce găsesc una, ți-o aduc negreșit.",
        "Poți deschide și închide acest puzzle, iar el va lua poziții diferite — îl poți așeza în colț sau în centru.",
        "Mai există și un indicator aici, care arată câte chei ai acum — după cum vezi, momentan nu ai nicio cheie.",
        "Asta e tot deocamdată, cred că ți-am arătat tot. Dacă ai nevoie de ajutorul meu, poți apăsa pe mine sau pe iconița mea.",
        "Dacă vrei să te întorci vreodată aici, o să te aștept."
    ]
};

// hintText — только у тех записей, где он реально есть (индексы совпадают
// с индексами в introDialogueLines).
window.dialogueHintTranslations = {
    en: {
        16: "tap the settings icon to continue",
        17: "Tap the theme button",
        21: "tap the music box",
        25: "tap progress",
        31: "tap on letters",
        39: "To take the key from «имя», tap on them"
    },
    ro: {
        16: "apasă pe iconița de setări ca să continui",
        17: "Apasă pe butonul de teme",
        21: "apasă pe cutia muzicală",
        25: "apasă pe progres",
        31: "apasă pe scrisori",
        39: "Ca să iei cheia de la «имя», apasă pe el"
    }
};

// choices[].label — только у диалога 8 (индекс 7).
window.dialogueChoiceTranslations = {
    en: { 7: ["Yes, I want to", "Not yet"] },
    ro: { 7: ["Da, vreau", "Nu încă"] }
};

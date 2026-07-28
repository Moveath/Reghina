/*
 * Приветственные фразы собаки при возвращении на сайт (см.
 * js/character/returningGreeting.js) — показываются одной случайной
 * репликой, но ТОЛЬКО если за время отсутствия не случилось ничего важного
 * (новый ключ/письмо/музыка уже имеют приоритет и показываются вместо этого).
 */

const returningGreetingLinesRu = [
    "Привет, Регина 🐾",
    "Я всё ещё охраняю это место.",
    "Сегодня здесь довольно спокойно.",
    "Пока ничего нового не произошло.",
    "Я снова проверил все уголки сайта.",
    "Кажется, всё на своих местах.",
    "Новых секретов пока не нашёл.",
    "Почта сегодня молчит.",
    "Иногда здесь бывает удивительно тихо.",
    "Я рад, что ты снова заглянула.",
    "Кажется, сегодня хороший день для исследований.",
    "Музыкальная шкатулка скучает без гостей.",
    "Я всё ещё присматриваю за этим местом.",
    "Мне кажется, здесь стало немного уютнее.",
    "Сегодня ничего необычного. Пока что.",
    "Я снова обошёл весь сайт. Всё спокойно.",
    "Кажется, некоторые вещи лучше находить постепенно.",
    "Пока новостей нет. Но я продолжаю наблюдать."
];

// Редкие фразы (5% шанс вместо обычной) — см. pickReturningGreetingLine.
const returningGreetingRareLinesRu = [
    "Иногда мне кажется, что этот сайт живёт своей жизнью.",
    "Если честно, я до сих пор не понимаю, зачем людям столько кнопок.",
    "Кажется, здесь ещё осталось несколько секретов.",
    "Не рассказывай никому, но мне нравится наблюдать за происходящим."
];

window.returningGreetingLineTranslations = {
    en: [
        "Hi, Regina 🐾",
        "I'm still guarding this place.",
        "It's been pretty quiet here today.",
        "Nothing new has happened yet.",
        "I checked every corner of the site again.",
        "Looks like everything's where it should be.",
        "Haven't found any new secrets yet.",
        "The mail's been quiet today.",
        "Sometimes it gets surprisingly quiet around here.",
        "I'm glad you dropped by again.",
        "Seems like a good day for exploring.",
        "The music box misses having visitors.",
        "I'm still keeping an eye on this place.",
        "I feel like it's gotten a bit cozier here.",
        "Nothing unusual today. Not yet, anyway.",
        "I went around the whole site again. All calm.",
        "I guess some things are better found little by little.",
        "No news yet. But I'm still watching."
    ],
    ro: [
        "Bună, Regina 🐾",
        "Încă păzesc locul ăsta.",
        "Azi e destul de liniște aici.",
        "Deocamdată nu s-a întâmplat nimic nou.",
        "Am verificat din nou fiecare colț al site-ului.",
        "Se pare că totul e la locul lui.",
        "N-am găsit încă secrete noi.",
        "Poșta a tăcut azi.",
        "Uneori e surprinzător de liniște aici.",
        "Mă bucur că ai trecut din nou pe aici.",
        "Parcă azi e o zi bună pentru explorat.",
        "Cutiei muzicale îi e dor de vizitatori.",
        "Încă am grijă de locul ăsta.",
        "Mi se pare că a devenit puțin mai cald aici.",
        "Nimic neobișnuit azi. Deocamdată.",
        "Am făcut din nou tot ocolul site-ului. Totul e liniștit.",
        "Cred că unele lucruri e mai bine să le descoperi treptat.",
        "Deocamdată nicio veste. Dar tot veghez."
    ]
};

window.returningGreetingRareLineTranslations = {
    en: [
        "Sometimes I feel like this site has a life of its own.",
        "Honestly, I still don't get why people need so many buttons.",
        "I think there are still a few secrets left here.",
        "Don't tell anyone, but I like watching what happens."
    ],
    ro: [
        "Uneori simt că site-ul ăsta are viață proprie.",
        "Sincer, tot nu înțeleg de ce oamenii au nevoie de atâtea butoane.",
        "Cred că mai sunt câteva secrete pe-aici.",
        "Nu spune nimănui, dar îmi place să urmăresc ce se întâmplă."
    ]
};

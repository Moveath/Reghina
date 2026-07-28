/*
 * Собака-проводник: клик по самой собаке / её имени / иконке открывает
 * небольшое меню рядом с ней — случайная приветственная фраза + кнопки
 * разделов сайта. См. обработчик в js/character/dogGuide.js.
 */

const dogGuideGreetingLinesRu = [
    "Привет, Регина 🐾 Я всё ещё охраняю это место.",
    "Рад снова тебя видеть.",
    "Кажется, сегодня здесь спокойно.",
    "Пока ничего нового не произошло.",
    "Ключей пока не нашёл, но продолжаю искать.",
    "Все письма на месте.",
    "Хорошо, что ты снова заглянула сюда.",
    "Я проверил сайт. Всё работает как надо.",
    "Иногда полезно просто немного осмотреться вокруг.",
    "Музыкальная шкатулка сегодня выглядит одиноко.",
    "Кажется, где-то ещё остались секреты.",
    "Я всё ещё здесь.",
    "Иногда мне кажется, что этот сайт живёт своей жизнью.",
    "Не переживай, я ничего не сломал. Наверное.",
    "Мне нравится, когда сюда возвращаются.",
    "Если что-то понадобится, попробуем найти вместе."
];

window.dogGuideGreetingLineTranslations = {
    en: [
        "Hi, Regina 🐾 Still guarding this place.",
        "Good to see you again.",
        "Feels pretty calm here today.",
        "Nothing new has happened yet.",
        "Haven't found any keys yet, but still looking.",
        "All the letters are in place.",
        "Good that you came back here.",
        "I checked the site. Everything works fine.",
        "Sometimes it's nice to just look around a little.",
        "The music box looks a bit lonely today.",
        "Feels like there are still some secrets left somewhere.",
        "I'm still here.",
        "Sometimes I feel like this site has a life of its own.",
        "Don't worry, I didn't break anything. Probably.",
        "I like it when you come back here.",
        "If you need anything, we'll try to find it together."
    ],
    ro: [
        "Salut, Regina 🐾 Încă păzesc locul ăsta.",
        "Mă bucur să te văd din nou.",
        "Pare destul de liniște aici azi.",
        "Deocamdată nu s-a întâmplat nimic nou.",
        "N-am găsit încă nicio cheie, dar tot caut.",
        "Toate scrisorile sunt la locul lor.",
        "Bine că ai trecut din nou pe aici.",
        "Am verificat site-ul. Totul funcționează cum trebuie.",
        "Uneori e plăcut doar să te uiți puțin în jur.",
        "Cutia muzicală pare puțin singură azi.",
        "Parcă mai sunt secrete pe undeva.",
        "Tot aici sunt.",
        "Uneori simt că site-ul ăsta trăiește viața lui.",
        "Nu-ți face griji, n-am stricat nimic. Probabil.",
        "Îmi place când te întorci aici.",
        "Dacă ai nevoie de ceva, căutăm împreună."
    ]
};

// Письма: если есть непрочитанные — своя строка, иначе своя, плюс общий
// пул строк, доступный в обоих случаях.
const dogGuideLettersUnreadLineRu = "Кажется, у меня есть письмо для тебя.";
const dogGuideLettersNoUnreadLineRu = "Пока новых писем нет. Если будут — обязательно передам.";
const dogGuideLettersPoolLineRu = [
    "Почта сама себя не доставит.",
    "Надеюсь, я ничего не потерял по дороге.",
    "Иногда письма говорят больше, чем слова."
];

window.dogGuideLettersTranslations = {
    en: {
        unread: "Looks like I've got a letter for you.",
        noUnread: "No new letters yet. If any show up, I'll bring them right over.",
        pool: [
            "Mail won't deliver itself.",
            "Hope I didn't lose anything on the way.",
            "Sometimes letters say more than words do."
        ]
    },
    ro: {
        unread: "Se pare că am o scrisoare pentru tine.",
        noUnread: "Deocamdată nu sunt scrisori noi. Dacă apar, ți le aduc imediat.",
        pool: [
            "Poșta nu se livrează singură.",
            "Sper că n-am pierdut nimic pe drum.",
            "Uneori scrisorile spun mai mult decât cuvintele."
        ]
    }
};

const dogGuideMusicLinesRu = [
    "Хорошая музыка делает любое место уютнее.",
    "Интересно, какая песня понравится тебе сегодня.",
    "Здесь собраны особенные мелодии.",
    "Иногда музыка говорит лучше текста."
];

window.dogGuideMusicLineTranslations = {
    en: [
        "Good music makes any place feel cozier.",
        "Wonder which song you'll like today.",
        "There are some special tunes gathered here.",
        "Sometimes music says it better than words."
    ],
    ro: [
        "Muzica bună face orice loc mai plăcut.",
        "Mă întreb ce melodie o să-ți placă azi.",
        "Aici sunt adunate niște melodii speciale.",
        "Uneori muzica spune mai bine decât cuvintele."
    ]
};

const dogGuideHistoryLinesRu = [
    "Здесь можно увидеть, как всё начиналось.",
    "Некоторые старые версии выглядят довольно забавно.",
    "Этот раздел хранит историю всего проекта.",
    "Иногда интересно посмотреть, с чего всё началось."
];

window.dogGuideHistoryLineTranslations = {
    en: [
        "Here you can see how it all began.",
        "Some of the old versions look pretty funny.",
        "This section keeps the whole project's history.",
        "Sometimes it's interesting to see where it all started."
    ],
    ro: [
        "Aici poți vedea cum a început totul.",
        "Unele versiuni vechi arată destul de amuzant.",
        "Această secțiune păstrează istoria întregului proiect.",
        "Uneori e interesant să vezi de unde a pornit totul."
    ]
};

const dogGuideIdeaLinesRu = [
    "Здесь находится история появления всей этой идеи.",
    "Всё началось намного раньше, чем кажется.",
    "Некоторые идеи появились совершенно случайно.",
    "Иногда одна мысль превращается во что-то большее."
];

window.dogGuideIdeaLineTranslations = {
    en: [
        "This is the story of how the whole idea came to be.",
        "It all started a lot earlier than it seems.",
        "Some ideas showed up completely by accident.",
        "Sometimes one thought turns into something much bigger."
    ],
    ro: [
        "Aici e povestea de unde a apărut toată ideea asta.",
        "Totul a început cu mult mai devreme decât pare.",
        "Unele idei au apărut complet întâmplător.",
        "Uneori un gând se transformă în ceva mult mai mare."
    ]
};

const dogGuideAboutLinesRu = [
    "Если потеряешься, этот раздел поможет разобраться.",
    "Здесь собрана информация о проекте.",
    "Иногда полезно узнать, как всё устроено.",
    "Небольшая инструкция по этому сайту."
];

window.dogGuideAboutLineTranslations = {
    en: [
        "If you get lost, this section will help you figure things out.",
        "This is where the info about the project lives.",
        "Sometimes it helps to know how everything works.",
        "A small guide to this site."
    ],
    ro: [
        "Dacă te pierzi, secțiunea asta te ajută să înțelegi.",
        "Aici e adunată informația despre proiect.",
        "Uneori e util să știi cum funcționează totul.",
        "Un mic ghid pentru acest site."
    ]
};

const dogGuideDogInfoLinesRu = [
    "Наконец-то раздел про меня.",
    "Здесь собраны все мои эмоции.",
    "Надеюсь, фотографии получились удачными.",
    "Это моя любимая страница."
];

window.dogGuideDogInfoLineTranslations = {
    en: [
        "Finally, a section about me.",
        "All my emotions are gathered here.",
        "Hope the photos turned out well.",
        "This is my favorite page."
    ],
    ro: [
        "În sfârșit, o secțiune despre mine.",
        "Aici sunt adunate toate emoțiile mele.",
        "Sper că pozele au ieșit bine.",
        "Asta e pagina mea preferată."
    ]
};

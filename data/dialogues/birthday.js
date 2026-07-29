/*
 * Реплики особого события ко дню рождения (см. js/character/birthdayEvent.js
 * и showBirthdayEventDialogue в js/dialogue/dialogue.js). Два варианта
 * вступления — ровно в день (1 октября) и "спохватились позже" — оба ведут
 * к одному и тому же подарку/ключу/открытию части.
 */

const birthdayEventLinesRu = {
    onDay: [
        "🎉 Привет, Регина!",
        "Кажется, сегодня особенный день.",
        "Поэтому я приготовил для тебя небольшой подарок.",
        "Надеюсь, сегодняшний день принесёт много приятных моментов, улыбок и хорошего настроения.",
        "А теперь давай посмотрим, что находится внутри подарка."
    ],
    later: [
        "🎉 Привет, Регина!",
        "Кажется, совсем недавно у тебя был день рождения.",
        "И хотя ты не заглянула сюда именно 1 октября, у меня всё ещё есть подарок для тебя.",
        "Думаю, его всё равно стоит открыть."
    ],
    wow: [
        "🐾 Вау!",
        "Похоже, внутри был ещё один ключ.",
        "Кажется, он может открыть что-то новое."
    ]
};

window.birthdayEventLineTranslations = {
    en: {
        onDay: [
            "🎉 Hi, Regina!",
            "Looks like today is a special day.",
            "So I got a little gift ready for you.",
            "I hope today brings lots of nice moments, smiles, and good mood.",
            "Now let's see what's inside the gift."
        ],
        later: [
            "🎉 Hi, Regina!",
            "Looks like your birthday was just recently.",
            "And even though you didn't stop by exactly on October 1st, I still have a gift for you.",
            "I think it's still worth opening."
        ],
        wow: [
            "🐾 Whoa!",
            "Looks like there was another key inside.",
            "I think it can open something new."
        ]
    },
    ro: {
        onDay: [
            "🎉 Salut, Regina!",
            "Se pare că azi e o zi specială.",
            "Așa că ți-am pregătit un mic cadou.",
            "Sper ca ziua de azi să-ți aducă multe momente plăcute, zâmbete și dispoziție bună.",
            "Acum hai să vedem ce e în cadou."
        ],
        later: [
            "🎉 Salut, Regina!",
            "Se pare că ai avut ziua de naștere de curând.",
            "Și deși nu ai trecut pe aici exact pe 1 octombrie, tot mai am un cadou pentru tine.",
            "Cred că merită deschis oricum."
        ],
        wow: [
            "🐾 Uau!",
            "Se pare că mai era o cheie înăuntru.",
            "Cred că poate deschide ceva nou."
        ]
    }
};

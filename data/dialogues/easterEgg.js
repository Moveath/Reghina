/*
 * Пасхалка: если нажать на собаку 5 раз подряд, она отвечает случайной
 * фразой (см. обработчик клика в js/dialogue/dialogue.js). Раньше этот же
 * жест открывал Developer Panel — теперь для неё отдельная комбинация
 * клавиш (см. js/dev/devPanel.js), а 5 кликов по собаке стали пасхалкой.
 */

const dogClickEasterEggLinesRu = [
    "Я вообще-то работаю.",
    "Письма сами себя не доставят.",
    "Кажется, меня слишком часто нажимают.",
    "Ладно-ладно, я тут, никуда не делся.",
    "Между прочим, у меня тоже есть чувства.",
    "Хочешь потрогать  гладь, а не тыкай.",
    "Если честно, мне это даже нравится.",
    "Ты точно это не специально делаешь?"
];

window.dogClickEasterEggLineTranslations = {
    en: [
        "I'm actually working here.",
        "Letters won't deliver themselves.",
        "Feels like I'm getting clicked a bit too much.",
        "Alright, alright, I'm still here.",
        "For the record, I have feelings too.",
        "If you want to pet me, pet me — don't just poke.",
        "Honestly? I kind of like this.",
        "You're not doing that on purpose, are you?"
    ],
    ro: [
        "De fapt, eu lucrez aici.",
        "Scrisorile nu se livrează singure.",
        "Parcă sunt apăsat cam des.",
        "Bine, bine, tot aici sunt.",
        "Așa să știi, am și eu sentimente.",
        "Dacă vrei să mă mângâi, mângâie-mă — nu doar apasă.",
        "Sincer? Chiar îmi place asta.",
        "Nu faci asta intenționat, nu-i așa?"
    ]
};

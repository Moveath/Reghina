/*
 * Пасхалка: если подержать нажатой (не просто кликнуть, а именно
 * задержать палец/курсор на пару секунд — "погладить") область собаки, она
 * отвечает случайной фразой (см. обработчик pointerdown/pointerup в
 * js/dialogue/dialogue.js). Раньше тот же угловой клик по собаке открывал
 * Developer Panel — теперь для неё отдельная комбинация клавиш (см.
 * js/dev/devPanel.js), с этой пасхалкой никак не связана.
 */

const dogClickEasterEggLinesRu = [
    "Я вообще-то работаю.",
    "Письма сами себя не доставят.",
    "Кажется, меня слишком часто нажимают.",
    "Ладно-ладно, я тут, никуда не делся.",
    "Вот так, гладь — мне нравится.",
    "Если честно, мне это даже нравится.",
    "Ты точно это не специально делаешь?"
];

window.dogClickEasterEggLineTranslations = {
    en: [
        "I'm actually working here.",
        "Letters won't deliver themselves.",
        "Feels like I'm getting clicked a bit too much.",
        "Alright, alright, I'm still here.",
        "That's more like it — I like being petted.",
        "Honestly? I kind of like this.",
        "You're not doing that on purpose, are you?"
    ],
    ro: [
        "De fapt, eu lucrez aici.",
        "Scrisorile nu se livrează singure.",
        "Parcă sunt apăsat cam des.",
        "Bine, bine, tot aici sunt.",
        "Așa da — îmi place să fiu mângâiat.",
        "Sincer? Chiar îmi place asta.",
        "Nu faci asta intenționat, nu-i așa?"
    ]
};

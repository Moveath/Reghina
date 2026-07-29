/*
 * Скрытая пасхалка: если имя, которое придумали собаке — при первом выборе
 * во время интро или при любом последующем переименовании через "О собаке"
 * (см. renameDog в js/dialogue/dialogue.js) — совпадает с одним из
 * персонажей "Сверхъестественного", собака ОДИН РАЗ, сразу после
 * подтверждения имени, произносит случайную реплику-намёк. Это не отдельная
 * сюжетная ветка и не смена сценария — просто одна фраза, дальше сайт
 * продолжает работать как обычно (см. showSupernaturalNameEasterEgg и
 * isSupernaturalDogName в js/dialogue/dialogue.js).
 *
 * Список имён — только явно перечисленные варианты написания (кириллица и
 * латиница, полные имена и распространённые сокращения); сравнение
 * регистронезависимое и с схлопыванием лишних пробелов, но без "нечёткого"
 * совпадения — см. normalizeSupernaturalDogName в dialogue.js.
 */
const SUPERNATURAL_DOG_NAMES = [
    "дин", "dean", "дин винчестер", "dean winchester",
    "сэм", "сам", "sam", "sam winchester", "сэм винчестер",
    "кас", "cas", "castiel", "кастиэль",
    "кроули", "crowley",
    "бобби", "bobby",
    "джек", "jack"
];
window.SUPERNATURAL_DOG_NAMES = SUPERNATURAL_DOG_NAMES;

const supernaturalDogNameLinesRu = [
    "🐶 Подожди... Мне кажется, я уже слышал это имя раньше.",
    "🐶 Очень знакомое имя. Даже слишком знакомое.",
    "🐶 Интересный выбор. Кажется, где-то рядом должна стоять чёрная Impala.",
    "🐶 Надеюсь, сегодня нам не придётся охотиться на демонов.",
    "🐶 Кажется, я слышал это имя в одном сериале.",
    "🐶 Теперь у меня странное чувство, будто впереди нас ждёт какое-нибудь сверхъестественное приключение.",
    "🐶 Любопытно. Почему-то это имя вызывает у меня ощущение дороги и чёрного автомобиля.",
    "🐶 Очень сверхъестественный выбор"
];

window.supernaturalDogNameLineTranslations = {
    en: [
        "🐶 Wait... I think I've heard that name before.",
        "🐶 Very familiar name. A little too familiar.",
        "🐶 Interesting choice. Feels like there should be a black Impala parked nearby.",
        "🐶 I hope we won't have to hunt any demons today.",
        "🐶 I think I've heard that name in some TV show.",
        "🐶 Now I have this strange feeling that some kind of supernatural adventure is waiting ahead of us.",
        "🐶 Curious. For some reason that name gives me a feeling of an open road and a black car.",
        "🐶 A very supernatural choice"
    ],
    ro: [
        "🐶 Stai... Parcă am mai auzit numele ăsta.",
        "🐶 Nume foarte cunoscut. Chiar prea cunoscut.",
        "🐶 Alegere interesantă. Parcă ar trebui să fie o Impala neagră parcată pe undeva pe-aproape.",
        "🐶 Sper că azi nu va trebui să vânăm demoni.",
        "🐶 Parcă am auzit numele ăsta într-un serial.",
        "🐶 Acum am un sentiment ciudat că ne așteaptă o aventură supranaturală.",
        "🐶 Curios. Din nu știu ce motiv, numele ăsta îmi dă o senzație de drum și mașină neagră.",
        "🐶 O alegere foarte supranaturală"
    ]
};

/*
 * Вторая пасхалка того же семейства: скрытая клавиатурная последовательность
 * (без поля ввода — печатать можно в любом месте сайта), работает ТОЛЬКО
 * после завершения интро (см. supernaturalTypedBuffer/isIntroAlreadyCompleted
 * в js/dialogue/dialogue.js). Слова сравниваются регистронезависимо —
 * кириллица и латиница вперемешку, как их и печатают в реальности при разных
 * раскладках клавиатуры.
 */
const SUPERNATURAL_TYPED_WORDS = [
    "67", "impala", "импала", "baby", "chevy", "chevrolet"
];
window.SUPERNATURAL_TYPED_WORDS = SUPERNATURAL_TYPED_WORDS;

const supernaturalTypedWordLinesRu = [
    "🐶 Подожди... Ты тоже знаешь про Impala?",
    "🐶 67. Очень хорошее число.",
    "🐶 Мне кажется, где-то неподалёку должен стоять чёрный Chevrolet.",
    "🐶 Некоторые машины становятся легендами.",
    "🐶 Если увидишь старую Impala, обязательно позови меня.",
    "🐶 Интересное слово. Почему-то оно кажется мне очень знакомым.",
    "🐶 Кажется, я только что вспомнил одну очень длинную дорогу.",
    "🐶 Иногда машина может стать частью истории."
];

window.supernaturalTypedWordLineTranslations = {
    en: [
        "🐶 Wait... You know about the Impala too?",
        "🐶 67. A very good number.",
        "🐶 I feel like there should be a black Chevrolet parked somewhere nearby.",
        "🐶 Some cars become legends.",
        "🐶 If you ever see an old Impala, make sure to call me over.",
        "🐶 Interesting word. For some reason it feels very familiar.",
        "🐶 I think I just remembered one very long road.",
        "🐶 Sometimes a car can become part of a story."
    ],
    ro: [
        "🐶 Stai... Și tu știi despre Impala?",
        "🐶 67. Un număr foarte bun.",
        "🐶 Am impresia că pe undeva pe-aproape ar trebui să fie parcat un Chevrolet negru.",
        "🐶 Unele mașini devin legende.",
        "🐶 Dacă vezi vreodată o Impala veche, sună-mă neapărat.",
        "🐶 Cuvânt interesant. Din nu știu ce motiv mi se pare foarte cunoscut.",
        "🐶 Parcă tocmai mi-am amintit de un drum foarte lung.",
        "🐶 Uneori o mașină poate deveni parte dintr-o poveste."
    ]
};

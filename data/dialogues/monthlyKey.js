/*
 * Реплики ежемесячных ключей — вызывается из checkMonthlyKey
 * (js/storage/storage.js) при каждом запуске сайта, когда сервер решил,
 * что положен новый ключ (см. POST /profile/:code/monthly-key). Сцена в
 * два этапа в одном и том же пузыре: сначала собака "нашла" что-то
 * (эмоция + случайная реплика), после подтверждения — сообщает, что часть
 * пазла открылась (см. showMonthlyKeyDialogue в js/dialogue/dialogue.js).
 */

const monthlyKeyFoundLinesRu = [
    "Кажется, сегодня я нашёл кое-что важное для тебя!",
    "У меня для тебя кое-какая находка... интересно, что это?",
    "Я всю ночь искал этот ключ и наконец-то нашёл его!",
    "Похоже, кто-то оставил для тебя новый секретный ключ."
];

const monthlyKeyOpenedLinesRu = [
    "Ура! Одна часть тайны стала открыта!",
    "Смотри, ещё один кусочек собрался!",
    "Кажется, мы стали ещё ближе к разгадке!",
    "Новый ключ подошёл! Пазл открывает следующую часть!"
];

// По 4 варианта на каждую из двух стадий, порядок такой же, как в
// monthlyKeyFoundLinesRu/monthlyKeyOpenedLinesRu выше.
window.monthlyKeyLineTranslations = {
    en: {
        found: [
            "It seems today I found something important for you!",
            "I've got a little discovery for you... wonder what it is?",
            "I searched all night for this key and finally found it!",
            "Looks like someone left a new secret key for you."
        ],
        opened: [
            "Yay! One more piece of the mystery is uncovered!",
            "Look, another piece just came together!",
            "Seems like we're getting even closer to the answer!",
            "The new key fit! The puzzle reveals its next piece!"
        ]
    },
    ro: {
        found: [
            "Se pare că azi am găsit ceva important pentru tine!",
            "Am o mică descoperire pentru tine... oare ce-o fi?",
            "Am căutat toată noaptea cheia asta și, în sfârșit, am găsit-o!",
            "Se pare că cineva ți-a lăsat o nouă cheie secretă."
        ],
        opened: [
            "Ura! Încă o bucată din mister a fost dezvăluită!",
            "Uite, s-a mai adunat o bucată!",
            "Parcă ne apropiem tot mai mult de răspuns!",
            "Cheia cea nouă s-a potrivit! Puzzle-ul dezvăluie următoarea bucată!"
        ]
    }
};

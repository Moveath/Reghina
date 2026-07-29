/*
 * Приветствие собаки при возвращении на сайт (не при самом интро) — единая
 * очередь с чётким приоритетом, чтобы события никогда не показывались
 * наперегонки друг с другом или в неправильном порядке:
 *
 *   1. Событие ко дню рождения (window.checkBirthdayEvent, см.
 *      js/character/birthdayEvent.js) — 1 октября (или первый визит после,
 *      если событие в этом году ещё не видели). Занимает то же место в
 *      очереди, что и обычный ежемесячный ключ (см. п.2) — это тот же самый
 *      ключ, просто показанный по-другому, поэтому если сработал день
 *      рождения, обычный ключ в этот же визит уже не проверяется.
 *   2. Новый ключ (checkMonthlyKey, см. js/storage/storage.js) —
 *      специальный сценарий (2 стадии + открытие кусочка пазла, см.
 *      showMonthlyKeyDialogue в js/dialogue/dialogue.js).
 *   3. Новое письмо (window.checkLetterGreeting, см. js/ui/letters.js).
 *   4. Новая музыка (window.checkMusicAddedGreeting, см. js/audio/music.js).
 *   5. (задел на будущее — другие важные события можно вставить сюда же,
 *      между музыкой и обычной фразой, тем же приёмом: onDone(shown)).
 *   6. Если ничего из 1-5 не показалось — одна случайная обычная
 *      приветственная фраза (5% шанс — редкая, см. data/dialogues/
 *      greeting.js).
 *
 * Каждый шаг вызывает следующий только через колбэк ПОСЛЕ того, как
 * предыдущая сцена реально закрылась — иначе, например, реплика про письмо
 * могла бы показаться раньше ключа только потому, что её сетевой запрос
 * ответил быстрее.
 *
 * Запускается из js/storage/storage.js (см. ensureOwnerCode().then(...)) —
 * тот же момент, где раньше вызывался голый checkMonthlyKey().
 */

function returningGreetingLang(){
    return typeof getSelectedLanguage === "function" ? getSelectedLanguage() : "ru";
}

// 5% шанс редкой фразы вместо обычной.
const RARE_GREETING_CHANCE = 0.05;

function pickReturningGreetingLine(){
    const lang = returningGreetingLang();
    const isRare = Math.random() < RARE_GREETING_CHANCE;

    if(isRare){
        const rareTranslated = window.returningGreetingRareLineTranslations && window.returningGreetingRareLineTranslations[lang];
        return pickRandomLine(rareTranslated || returningGreetingRareLinesRu);
    }

    const translated = window.returningGreetingLineTranslations && window.returningGreetingLineTranslations[lang];
    return pickRandomLine(translated || returningGreetingLinesRu);
}

function showReturningGreeting(){
    if(typeof showDogRemark === "function") showDogRemark(pickReturningGreetingLine(), "happy");
}

function returningGreetingAfterMusic(anyEventShown){
    // Ничего важного не произошло за время отсутствия — единственный
    // случай, когда показываем обычную (или редкую) приветственную фразу.
    if(!anyEventShown) showReturningGreeting();
}

function returningGreetingCheckMusic(anyEventShown){
    if(typeof window.checkMusicAddedGreeting === "function"){
        window.checkMusicAddedGreeting(shown => {
            returningGreetingAfterMusic(anyEventShown || shown);
        });
    } else {
        returningGreetingAfterMusic(anyEventShown);
    }
}

function returningGreetingCheckLetters(anyEventShown){
    if(typeof window.checkLetterGreeting === "function"){
        window.checkLetterGreeting(shown => {
            returningGreetingCheckMusic(anyEventShown || shown);
        });
    } else {
        returningGreetingCheckMusic(anyEventShown);
    }
}

async function returningGreetingCheckMonthlyKey(){
    if(typeof window.checkMonthlyKey !== "function"){
        returningGreetingCheckLetters(false);
        return;
    }

    // onGranted вместо ожидания result.granted из возврата: checkMonthlyKey
    // без этого колбэка сама вызвала бы showMonthlyKeyDialogue БЕЗ onClose —
    // тогда сцена ключа показалась бы дважды (один раз без очереди дальше,
    // второй раз отсюда) и вторая перезаписывала бы первую прямо посреди неё.
    let granted = false;
    try {
        await window.checkMonthlyKey(undefined, (pieceIndex) => {
            granted = true;
            // Пока ключ не будет полностью просмотрен и применён — письма,
            // музыка и обычная фраза ждут (см. onClose в showMonthlyKeyDialogue).
            if(typeof window.showMonthlyKeyDialogue === "function"){
                window.showMonthlyKeyDialogue(pieceIndex, () => {
                    returningGreetingCheckLetters(true);
                });
            }
        });
    } catch(e) { /* ниже уйдём в обычную очередь */ }

    if(!granted) returningGreetingCheckLetters(false);
}

async function runReturningVisitGreeting(){
    // Только для возвращающихся визитов — при самой интро (первый визит)
    // очередь ключ/письма/музыка/фраза не имеет смысла, у интро свой
    // собственный сценарий.
    if(typeof isIntroAlreadyCompleted !== "function" || !isIntroAlreadyCompleted()) return;

    // День рождения — тот же ключ, что и обычный ежемесячный, просто с
    // другим сценарием показа (см. js/character/birthdayEvent.js). Если он
    // сработал — очередь письма/музыка/фраза продолжается уже из его
    // собственного onDone, обычный ежемесячный ключ в этот визит не трогаем
    // (это был бы тот же самый ключ второй раз).
    if(typeof window.checkBirthdayEvent === "function"){
        window.checkBirthdayEvent((shown) => {
            if(shown){
                returningGreetingCheckLetters(true);
            } else {
                returningGreetingCheckMonthlyKey();
            }
        });
        return;
    }

    returningGreetingCheckMonthlyKey();
}

window.runReturningVisitGreeting = runReturningVisitGreeting;

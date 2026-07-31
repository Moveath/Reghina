/*
 * Дневник проводника (см. js/character/diary.js): новая запись появляется
 * раз в 2-5 дней, выбирается по тому, что происходило на сайте за этот
 * период — а не после каждого действия. Тексты здесь сгруппированы по
 * категориям (см. diaryCategoryPriority в js/character/diary.js), внутри
 * категории при генерации выбирается случайный шаблон.
 */

const diaryEntryLinesRu = {
    keys: [
        "Сегодня в моих лапах снова оказался ключ. Кажется, где-то там, за дверью, меня уже ждут.",
        "Я нашёл ключ и отдал его Регине. Надеюсь, за дверью будет что-то хорошее.",
        "Ключ нашёлся! Хочется думать, что каждый такой момент — маленькая победа.",
        "Сегодня появился новый ключ. Кажется, я всё-таки неплохо справляюсь со своей работой."
    ],
    letters: [
        "Сегодня снова открывались письма. Кажется, некоторые слова всё-таки находят своего адресата.",
        "Почта сегодня была в деле. Приятно смотреть, как письма находят того, кому предназначены.",
        "Кто-то сегодня читал письма. Я всегда немного волнуюсь, пока несу их — а вдруг потеряю по дороге.",
        "Письма сегодня не залежались. Хорошо, когда слова доходят вовремя."
    ],
    music: [
        "Сегодня в музыкальной шкатулке снова что-то играло. Хорошая музыка делает даже тихие дни немного теплее.",
        "Кто-то сегодня выбирал музыку. Мне нравится, когда в этом месте не совсем тихо.",
        "Сегодня звучала музыка. Кажется, у каждой мелодии здесь есть своя история.",
        "Музыкальная шкатулка сегодня не скучала. Я в это время просто сидел рядом и слушал."
    ],
    exploration: [
        "Сегодня кто-то заглядывал в разные уголки этого места. Мне нравится, когда здесь любопытствуют.",
        "Сегодня немного осматривались вокруг. Тут ещё много всего, что стоит найти.",
        "Кажется, сегодня было любопытно узнать, как всё здесь устроено. Я, честно говоря, тоже люблю иногда осматриваться.",
        "Сегодня кто-то знакомился с этим местом чуть ближе. Надеюсь, понравилось."
    ],
    absence: [
        "Тебя долго не было. Я не скучал — точнее, скучал, но не подавал вида.",
        "Здесь было тихо уже несколько дней. Я всё равно продолжал охранять это место, как обещал.",
        "Ты давно не заходила. Хорошо, что вернулась — я как раз начал придумывать, чем себя занять.",
        "Прошло немало дней без тебя. Ничего страшного — я умею терпеливо ждать."
    ],
    silence: [
        "Сегодня был тихий день. Иногда это даже приятно — просто немного помолчать вместе с этим местом.",
        "Ничего особенного не случилось. Я всё равно на месте, как и всегда.",
        "Сегодня всё было спокойно. Хорошие дни не обязательно должны быть шумными.",
        "День прошёл тихо. Я всё это время просто был рядом."
    ]
};

window.diaryEntryLineTranslations = {
    en: {
        keys: [
            "A key ended up in my paws again today. Feels like something's waiting behind that door.",
            "I found a key and handed it over. Hope there's something good behind that door.",
            "A key turned up! I like to think every one of these is a small win.",
            "A new key showed up today. Guess I'm actually pretty good at this job."
        ],
        letters: [
            "Letters were opened again today. Seems like some words really do find the person they're meant for.",
            "The mail was busy today. Nice to see letters finding the one they're meant for.",
            "Someone read letters today. I always worry a little while carrying them — what if I lost one on the way.",
            "Letters didn't sit around today. It's good when words arrive on time."
        ],
        music: [
            "Something was playing in the music box again today. Good music makes even quiet days a little warmer.",
            "Someone picked out music today. I like it when this place isn't completely silent.",
            "Music played today. Feels like every tune here has its own little story.",
            "The music box wasn't bored today. I just sat nearby and listened."
        ],
        exploration: [
            "Someone looked around different corners of this place today. I like it when people get curious here.",
            "There was some looking around today. There's still plenty left to find here.",
            "Seems like someone was curious how everything works here today. Honestly, I like poking around too sometimes.",
            "Someone got to know this place a little better today. Hope they liked it."
        ],
        absence: [
            "You were gone for a while. I didn't miss you — okay, I did, I just didn't show it.",
            "It's been quiet here for a few days. I kept guarding this place anyway, like I promised.",
            "You hadn't come by in a while. Good thing you're back — I was just starting to think up ways to keep myself busy.",
            "Quite a few days passed without you. It's fine — I know how to wait patiently."
        ],
        silence: [
            "Today was a quiet day. Sometimes that's actually nice — just being quiet together with this place for a bit.",
            "Nothing much happened. I'm still right here, same as always.",
            "Everything was calm today. Good days don't have to be loud.",
            "The day went by quietly. I just stayed close the whole time."
        ]
    },
    ro: {
        keys: [
            "Azi am avut din nou o cheie în lăbuțe. Parcă mă așteaptă ceva după ușa aia.",
            "Am găsit o cheie și am predat-o. Sper să fie ceva bun după ușa aia.",
            "A apărut o cheie! Îmi place să cred că fiecare astfel de moment e o mică victorie.",
            "Azi a apărut o cheie nouă. Parcă totuși mă descurc bine cu treaba asta."
        ],
        letters: [
            "Azi s-au deschis din nou scrisori. Parcă unele cuvinte chiar își găsesc destinatarul.",
            "Poșta a fost activă azi. Îmi place să văd cum scrisorile își găsesc destinatarul.",
            "Cineva a citit scrisori azi. Mereu mă emoționez puțin cât le duc — dacă pierd vreuna pe drum.",
            "Scrisorile nu au stat azi degeaba. E bine când cuvintele ajung la timp."
        ],
        music: [
            "Azi iar a cântat ceva în cutia muzicală. Muzica bună face chiar și zilele liniștite puțin mai calde.",
            "Cineva a ales muzică azi. Îmi place când locul ăsta nu e complet tăcut.",
            "Azi a cântat muzică. Parcă fiecare melodie de-aici are povestea ei.",
            "Cutia muzicală nu s-a plictisit azi. Eu doar am stat alături și am ascultat."
        ],
        exploration: [
            "Cineva s-a uitat azi prin diverse colțuri ale locului ăstuia. Îmi place când oamenii sunt curioși aici.",
            "Azi s-a mai cercetat puțin prin preajmă. Mai sunt multe de găsit aici.",
            "Parcă azi cineva a fost curios cum funcționează totul aici. Sincer, și mie îmi place uneori să mă uit peste tot.",
            "Cineva a cunoscut azi locul ăsta puțin mai bine. Sper că i-a plăcut."
        ],
        absence: [
            "Ai lipsit mult timp. Nu mi-a fost dor — bine, mi-a fost, dar nu am arătat-o.",
            "A fost liniște aici de câteva zile. Am continuat oricum să păzesc locul ăsta, cum am promis.",
            "Nu ai mai trecut de mult timp pe aici. Bine că te-ai întors — tocmai începusem să mă gândesc cu ce să mă ocup.",
            "Au trecut destule zile fără tine. Nu-i nimic — știu să aștept cu răbdare."
        ],
        silence: [
            "Azi a fost o zi liniștită. Uneori chiar e plăcut — să stai puțin în liniște alături de locul ăsta.",
            "Nu s-a întâmplat nimic deosebit. Tot aici sunt, ca întotdeauna.",
            "Azi a fost totul calm. Zilele bune nu trebuie neapărat să fie zgomotoase.",
            "Ziua a trecut liniștit. Tot timpul ăsta am stat pur și simplu alături."
        ]
    }
};

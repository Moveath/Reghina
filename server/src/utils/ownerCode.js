const supabase = require("../db/supabaseClient");

// Без 0/O/1/I/L — легко перепутать при ручном вводе кода на другом
// устройстве.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function generateCode(){
    let code = "";
    for(let i = 0; i < CODE_LENGTH; i++){
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
}

// Коллизия при алфавите из 32 символов и длине 8 практически невозможна,
// но лучше перепроверить в базе, чем один раз в жизни словить дубликат.
async function generateUniqueOwnerCode(){
    for(let attempt = 0; attempt < 5; attempt++){
        const code = generateCode();
        const { data, error } = await supabase
            .from("profiles")
            .select("owner_code")
            .eq("owner_code", code)
            .maybeSingle();

        if(error) throw new Error(error.message);
        if(!data) return code;
    }
    throw new Error("Не удалось сгенерировать уникальный код за 5 попыток.");
}

module.exports = { generateUniqueOwnerCode };

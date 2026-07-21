-- Финальная схема таблицы letters для системы "Письма" (Этап 2).
-- Безопасно прогонять в Supabase SQL Editor и на пустой базе, и повторно
-- поверх уже существующей таблицы из Этапа 1 (id, direction, text, status,
-- created_at, read_at) — апгрейднёт её до финальной структуры без потери
-- данных.

-- 1. Свежая установка: сразу создаёт таблицу в финальном виде.
create table if not exists letters (
    id                   uuid primary key default gen_random_uuid(),
    direction            text not null check (direction in ('outgoing', 'incoming')),
    message              text not null,
    status               text not null default 'pending' check (status in ('pending', 'delivered', 'read')),
    sender               text not null default 'regina',
    receiver             text not null default 'egor',
    created_at           timestamptz not null default now(),
    read_at              timestamptz,
    telegram_message_id  bigint
);

-- 2. Апгрейд таблицы Этапа 1: там колонка называлась "text" — переименовываем
--    в "message", только если она ещё не переименована.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'letters' and column_name = 'text'
    ) then
        alter table letters rename column text to message;
    end if;
end $$;

-- 3. Добавляет новые колонки, если их ещё нет (и на только что созданной,
--    и на апгрейженной таблице Этапа 1).
alter table letters add column if not exists sender text not null default 'regina';
alter table letters add column if not exists receiver text not null default 'egor';
alter table letters add column if not exists telegram_message_id bigint;

create index if not exists letters_direction_created_at_idx
    on letters (direction, created_at desc);

-- 4. Затравочное первое письмо от Егора, чтобы "Входящие" не были пустыми
--    при первом визите. Текст временный. Вставляется только если входящих
--    писем ещё нет — повторный запуск скрипта не наплодит дубликаты.
--    (Приветствие "Меня зовут Кане-корсо..." теперь НЕ письмо — это
--    декоративная подсказка прямо в интерфейсе, см. js/ui/letters.js.)
insert into letters (direction, message, status, sender, receiver)
select
    'incoming',
    'Здесь будет первое письмо от Егора',
    'delivered',
    'egor',
    'regina'
where not exists (select 1 from letters where direction = 'incoming');

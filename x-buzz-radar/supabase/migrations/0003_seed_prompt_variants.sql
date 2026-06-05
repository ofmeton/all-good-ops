-- 媒体 × hook × tone × format の代表組合せを seed として投入 (18 個 = 6 per platform)

-- X (thread / single)
insert into prompt_variants (platform, type, hook_template, tone, format, prompt_template) values
('x', 'thread', '数値見出し', 'casual_engineer', 'thread_3', 'TEMPLATE_X hook=数値見出し tone=casual_engineer format=thread_3'),
('x', 'thread', '対比', 'honest_experimenter', 'thread_3', 'TEMPLATE_X hook=対比 tone=honest_experimenter'),
('x', 'thread', '問いかけ', 'translator_explainer', 'thread_3', 'TEMPLATE_X hook=問いかけ tone=translator_explainer'),
('x', 'single', '数値見出し', 'data_first', 'single', 'TEMPLATE_X hook=数値見出し tone=data_first format=single'),
('x', 'thread', '失敗談', 'casual_engineer', 'thread_5', 'TEMPLATE_X hook=失敗談 tone=casual_engineer format=thread_5'),
('x', 'thread', 'リスト', 'data_first', 'thread_5', 'TEMPLATE_X hook=リスト tone=data_first format=thread_5');

-- Instagram (carousel)
insert into prompt_variants (platform, type, hook_template, tone, format, prompt_template) values
('instagram', 'carousel', '数値見出し', 'casual_engineer', 'carousel_9', 'TEMPLATE_IG hook=数値見出し tone=casual_engineer'),
('instagram', 'carousel', '対比', 'translator_explainer', 'carousel_9', 'TEMPLATE_IG hook=対比 tone=translator_explainer'),
('instagram', 'carousel', '問いかけ', 'honest_experimenter', 'carousel_9', 'TEMPLATE_IG hook=問いかけ tone=honest_experimenter'),
('instagram', 'carousel', 'リスト', 'data_first', 'carousel_9', 'TEMPLATE_IG hook=リスト tone=data_first'),
('instagram', 'carousel', '失敗談', 'casual_engineer', 'carousel_9', 'TEMPLATE_IG hook=失敗談 tone=casual_engineer'),
('instagram', 'carousel', '数値見出し', 'translator_explainer', 'carousel_9', 'TEMPLATE_IG hook=数値見出し tone=translator_explainer');

-- note (outline)
insert into prompt_variants (platform, type, hook_template, tone, format, prompt_template) values
('note', 'outline', '対比', 'translator_explainer', 'sections_4', 'TEMPLATE_NOTE hook=対比 tone=translator_explainer sections=4'),
('note', 'outline', '数値見出し', 'data_first', 'sections_5', 'TEMPLATE_NOTE hook=数値見出し tone=data_first sections=5'),
('note', 'outline', '失敗談', 'honest_experimenter', 'sections_4', 'TEMPLATE_NOTE hook=失敗談 tone=honest_experimenter sections=4'),
('note', 'outline', '問いかけ', 'casual_engineer', 'sections_4', 'TEMPLATE_NOTE hook=問いかけ tone=casual_engineer sections=4'),
('note', 'outline', 'リスト', 'data_first', 'sections_5', 'TEMPLATE_NOTE hook=リスト tone=data_first sections=5'),
('note', 'outline', '対比', 'casual_engineer', 'sections_4', 'TEMPLATE_NOTE hook=対比 tone=casual_engineer sections=4');

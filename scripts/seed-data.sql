-- Seed employee voice samples
INSERT INTO employee_voice_samples (email, example_post_1, example_post_2, example_post_3, blurb, is_sample)
VALUES
(
  'sarah.chen@meroka.com',
  'I spent 8 years building AI at big tech. Now I''m using it to give independent doctors their time back. Prior auth automation isn''t sexy—but watching a solo practice save 15 hours/week on paperwork? That''s the real AI revolution.',
  'Hot take: The best healthcare AI doesn''t replace physicians. It removes the administrative layers that were never supposed to exist in the first place. We''re not disrupting medicine. We''re restoring it.',
  'Just got off a call with a family medicine doc who said she can finally eat lunch again. Not because we built something fancy—because we automated the insurance phone tag that was eating 2 hours of her day. This is why I left FAANG.',
  'Sarah is Meroka''s Head of AI/Engineering. Former Google ML engineer who pivoted to healthcare after watching her physician mother burn out from admin burden. Deeply technical but communicates in plain language. Believes AI should serve humans not replace them.',
  true
),
(
  'marcus.williams@meroka.com',
  'Unpopular opinion: The ''efficiency'' private equity brings to healthcare is a feature for shareholders and a bug for patients. When a 15-minute visit becomes 7 minutes, someone pays the price. It''s not the investors.',
  'Talked to a retiring cardiologist yesterday who''s heartbroken. After 30 years building his practice, his only ''exit'' options are PE vultures or closing the doors. We''re building a third option. Stay tuned.',
  'The math of independent medicine doesn''t have to be impossible. It just requires leverage that individual practices don''t have alone. Collective power, individual control. That''s not idealism—that''s strategy.',
  'Marcus is Meroka''s Chief Strategy Officer. Former healthcare private equity associate who switched sides after seeing how consolidation destroys care quality. MBA from Wharton. Brings insider knowledge of how the system exploits physicians—and how to fight back.',
  true
),
(
  'priya.patel@meroka.com',
  'Just finished our latest member spotlight video. This gastroenterologist has been independent for 22 years. When I asked what keeps her going, she said: ''I know my patients'' grandchildren''s names.'' Try getting that from a 7-minute corporate slot.',
  'Healthcare marketing hot take: The best physician brands aren''t built on thought leadership threads. They''re built in exam rooms, one patient at a time. Our job is to amplify what''s already real.',
  'If your healthcare marketing strategy requires physicians to become influencers, you''ve already lost. The story of independent medicine sells itself—we just need to stop letting PE dominate the narrative.',
  'Priya is Meroka''s Head of Marketing. Former health system marketing director who became disillusioned with promoting ''patient-centered care'' that was anything but. Believes in authentic storytelling and letting physicians be physicians.',
  true
),
(
  'david.okonkwo@meroka.com',
  'Helped a 4-physician practice renegotiate their payer contracts last week. Together with 50 other practices in our network, they had leverage they''d never have alone. Their reimbursement went up 18%. Independence doesn''t mean isolation.',
  'The unsexy truth about saving independent medicine: It''s not just about passion. It''s about billing systems, contract negotiations, and group purchasing power. Mission without infrastructure is just a wish.',
  'Every week I talk to practice owners drowning in operational complexity designed for health systems with 50-person admin teams. We''re building the backend so they can focus on the front lines.',
  'David is Meroka''s VP of Operations. Former practice administrator who ran a 12-physician group for a decade before joining Meroka. Knows every pain point because he lived them. Obsessed with making the business of medicine simple.',
  true
),
(
  'elena.rodriguez@meroka.com',
  'Physicians don''t have a financial literacy problem. They have an ''everyone''s trying to extract value from them'' problem. Insurance companies, EMR vendors, PE—the entire ecosystem is optimized against the independent doc. We''re changing the equation.',
  'Just modeled out a succession scenario for a retiring internist. Traditional options: sell to PE or close. Our model: transition to a younger physician who stays independent, with liquidity for the retiree. Everyone wins except the consolidators.',
  'The biggest lie in healthcare finance: ''You can''t compete with health systems.'' You can''t compete ALONE. But 500 independent practices with shared services and capital access? That''s a different story entirely.',
  'Elena is Meroka''s CFO. Former healthcare investment banker who saw the industry from the capital side. Left to help physicians access capital without giving up control. Believes financial independence is the foundation of clinical independence.',
  true
),
(
  'james.kim@meroka.com',
  '12 years as a primary care doc taught me one thing: the system isn''t broken. It''s working exactly as designed—just not for patients or physicians. At Meroka, we''re designing a different system.',
  'I left my practice not because I stopped loving medicine, but because I couldn''t love it properly anymore. 23 patients a day, 4 hours of charting at night, and constant prior auth battles. Now I''m fighting to save what I couldn''t save for myself.',
  'The best physicians I know aren''t on LinkedIn building personal brands. They''re in clinics at 7 AM and finishing notes at midnight. Our job isn''t to make them influencers—it''s to give them their lives back.',
  'James is Meroka''s Chief Medical Officer. Board-certified family medicine physician who practiced independently for 12 years before joining to lead Meroka''s clinical strategy. Brings frontline credibility and deep empathy for what physicians face daily.',
  true
)
ON CONFLICT (email) DO UPDATE SET
  example_post_1 = EXCLUDED.example_post_1,
  example_post_2 = EXCLUDED.example_post_2,
  example_post_3 = EXCLUDED.example_post_3,
  blurb = EXCLUDED.blurb,
  is_sample = EXCLUDED.is_sample,
  updated_at = NOW();

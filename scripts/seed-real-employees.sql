-- Seed real Meroka employee data for employee voice samples
-- Based on Employee Ambassador - Data - Sheet1.csv

INSERT INTO employee_voice_samples (email, example_post_1, example_post_2, example_post_3, blurb, is_sample)
VALUES

-- Clara Caden - Intern, Corporate Development
(
  'clara.caden@meroka.com',
  'IT''S TIME TO BUILD THE PIPELINE 🛢️

We''re taking 100 of Montreal''s best student builders to Toronto Tech week in May 🚀. These aren''t just students; they''re the people building Montreal''s economy as we know it.

It''s called Project Atlas.

We''re opening a few select slots for partners to get involved.

If you''re in the VC, incubator, or founder space, this is NOT an opportunity worth missing.

Reach out to get involved.',
  'Canada deserves its own student-led innovation hub, so McGill Ventures is building it.

Say hi to the Student Venture Network (SVN) 🚀

A Slack community connecting Canada''s most ambitious university clubs to collaborate, scale, share resources, and level up together.

Already in: RCVC (UofT), IVCC (Western), ENGCOMM (Concordia), Polyentrepreneuriat (Polytechnique MTL), PolyFinances (Polytechnique MTL).
Next up: You?

If you''re a club or student builder based in Canada building cool things and want to join a national network of student innovators, DM me!',
  'The best opportunities don''t come from waiting—they come from building. At Meroka, we''re not just talking about saving independent medicine. We''re actually doing it. High agency, high impact. That''s the energy.',
  'Clara is a Gen Z Intern in Corporate Development at Meroka. High agency, clever and casual tone. Attracted to Meroka by the desire to work on a high impact mission and the opportunity to tap into her entrepreneurial/creative spirit. Previously led McGill Ventures initiatives including Project Atlas.',
  false
),

-- Othmane Zizi - Product Manager, AI Engineer
(
  'othmane.zizi@meroka.com',
  'AI is moving so fast, but sometimes, brushing up on fundamentals can go a long way.

Just built an end-to-end pipeline on Microsoft Fabric from ingestion to dashboarding, leveraging Apache Spark. ✨

Past a certain scale, companies with terabytes of data must adapt their stack to run their analytics. They''d require a lakehouse and warehouse to process and centralize their massive datasets, which would come from many sources, like multiple ERPs across geographies.

Cloud solutions like Microsoft Fabric manage the Spark engine under the hood. They provide many great features like scheduling runs of your ETL notebooks so you can ingest and process new data automatically at a frequency you set. The whole process is much more seamless than the keywords may suggest.',
  'Excited to share my latest open-source project: 𝐅𝐮𝐥𝐜𝐫𝐮𝐦 𝐀𝐈, an autonomous agent for data-driven procurement strategy, built on the Databricks platform. 📈

Standard LLMs are unreliable for high-stakes business decisions; they can''t access the live, proprietary data needed to make verifiable recommendations. For a company making a multi-million dollar decision on raw materials, a probabilistic guess isn''t good enough.

Fulcrum AI is a true agentic system where the LLM acts as an orchestrator, connecting its reasoning capabilities to reliable, high-performance computation. Deterministic code gets the hard facts. LLMs reason with them. The best of both worlds in a single, cohesive agent.',
  '𝗧𝗵𝗲 𝗴𝗮𝗽 𝗯𝗲𝘁𝘄𝗲𝗲𝗻 𝗶𝗱𝗲𝗮 𝗮𝗻𝗱 𝗶𝗺𝗽𝗹𝗲𝗺𝗲𝗻𝘁𝗮𝘁𝗶𝗼𝗻 𝗵𝗮𝘀 𝗻𝗲𝘃𝗲𝗿 𝗯𝗲𝗲𝗻 𝘁𝗵𝗶𝘀 𝘁𝗵𝗶𝗻.

The year 2025, dubbed "the year of agents" by Silicon Valley investors, has certainly lived up to its name. My experience with CLI-based agentic code-gen tools like Claude Code has been nothing short of spectacular. What once required a team of seasoned engineers and a month of work, I did in just six hours.

The future belongs to those who think critically, strategize, harness AI, and iterate quickly. As software development becomes increasingly commoditized, the importance of distribution, network effects, and brand equity will only grow.',
  'Othmane is Meroka''s Product Manager and AI Engineer. Builds agentic AI systems and data pipelines. Deep expertise in LLMs, Apache Spark, and cloud infrastructure. Believes in shipping fast with AI assistance while maintaining high code quality. Technical depth with practical application.',
  false
),

-- Alexandra Kiekens - Chief of Staff
(
  'alexandra.kiekensarana@meroka.com',
  'Thank you Eric Bricker, MD for this great shoutout!

I''m excited to be working on RHC certification for a rural OB/GYN clinic in West Virginia, a step that not only expands access to care for underserved communities but could also increase the clinic''s profitability by $300K per year.

At Meroka, we don''t take over practices, we help them thrive independently. Through operational support, ownership-focused structures, and smart transitions, we give clinics the tools to grow without giving up control.',
  'Exciting to see Meroka highlighted by Better Tomorrow Ventures as part of the next wave of innovation at the intersection of Fintech and AI.

BTV describes Meroka as "a compelling alternative to private equity" - helping independently owned health practices transition into shared-ownership models that combine the economic advantages of a centralized system with the empathy and community focus of local independent care.

We''re proud to be building a model that rewards healthcare employees with ownership, creates healthier practice economics, and sets the foundation for long-term sustainability in community medicine.',
  'At Meroka, we believe in more than the traditional PE or VC playbook.

We''re building something different: an Ownership model that puts power in the hands of the people actually doing the work.👩‍⚕️ By aligning incentives and fostering real accountability, we''re not just growing a business—we''re growing leaders.

Capital is fuel. 💰
Code is infrastructure. 💻
But commitment—that''s what makes it sustainable. 🤝',
  'Alexandra is Meroka''s Chief of Staff. Works directly on practice partnerships, RHC certifications, and operational support for independent clinics. Focused on helping practices thrive independently through ownership-focused structures and smart transitions. Bridge between strategy and execution.',
  false
),

-- Bonnie Rwemalika - Project Manager, Operations
(
  'bonniesylvie.rwemalika@meroka.com',
  'Welcome to POD B – Experience & Added Value for Independent Practices.

Following our kickoff meeting, I''m excited to officially launch POD B, focused on exploring and building the added value we can bring to independent practices within the collective.

This quarter, POD B will work on the Enterprise Value Product. I''ve shared a summary outlining the problem space, goals, and hypotheses we''ll be testing—please take a moment to review it and react or comment directly with questions or thoughts.',
  'The best operations work is invisible. When independent practices can focus entirely on patient care—without drowning in admin, billing complexity, or vendor negotiations—that''s when we know we''re doing our job right.

At Meroka, we''re building the backend infrastructure so physicians can stay on the front lines where they belong.',
  'Independent practices don''t fail because physicians aren''t good at medicine. They fail because the system is designed for 50-person admin teams, not solo practitioners.

We''re changing that equation. One process at a time. One practice at a time.',
  'Bonnie is Meroka''s Project Manager in Operations. Leads POD B focused on experience and added value for independent practices. Drives the Enterprise Value Product initiative. Operational excellence mindset with focus on removing friction for physicians.',
  false
),

-- Antoine Bertrand - Finance, Corporate Development
(
  'antoine.bertrand@meroka.com',
  '🚀 Exciting news! We''ve raised our seed round!

Proud to announce Meroka''s $6M seed round, backed by Better Tomorrow Ventures, Slow Ventures, and 8VC.

I had the privilege of working directly with Alex on this raise, from developing the business model to shaping the story for the partners who now back our mission. It''s been a crash course in fundraising and an incredible learning experience.

Meroka exists to keep physicians independent and to restore humanity in healthcare. With this raise, we''re doubling down on that vision, building a future where independent care is the way forward for both providers and patients.',
  'Last Monday, TEDxLondonBusinessSchool 2025 came to life — the result of six months of hard work and collaboration across an incredible team.

It was an absolute pleasure to be part of the Speaker Committee this year — a team filled with heart, hustle, and endless curiosity. I had the opportunity to work closely with incredible speakers delivering stimulating talks.

Huge thanks to our co-chairs and Speaker Committee Lead, whose leadership grounded and guided us throughout.',
  'Thrilled and proud to share the incredible journey of my dear friend as she transitions from consultant to entrepreneur! A few months ago, she took the bold step of leaving her consulting career to pursue her passions.

Your positivity, creativity, and dedication have always been an inspiration. I couldn''t be happier for you and can''t wait to see all the amazing things you''ll accomplish.',
  'Antoine is in Finance and Corporate Development at Meroka. Worked directly on Meroka''s $6M seed round with investors including Better Tomorrow Ventures, Slow Ventures, and 8VC. Background in business model development and investor storytelling. Also involved in TEDxLondonBusinessSchool as part of the Speaker Committee.',
  false
),

-- Alex Barrett - CEO, Founder
(
  'alex@meroka.com',
  'The real power move when hiring or interviewing for a role is to offer BAD references. The hiring process is all about short-circuiting the trust process, and the best way I can think of to build trust is to speak to people that might not like me very much (people I''ve let go, founders I''ve passed on, boards I served on that were dysfunctional, etc).

The reference call with the ex-manager (friend?) that tells me how great you are is of very limited value. Sure there are techniques to extract knowledge there, but I''d much rather speak to someone that you didn''t see eye-to-eye with or that saw you at a low.',
  'I hate talking about my CPA since it was over 10 years ago and (mostly) a waste of time. But to answer Mark Cuban''s question here about why no healthcare practices use accrual accounting?

Exhibit 1 is that his post has 500 replies and counting and almost every single reply gets accrual accounting principles totally wrong. Nobody understands it or knows wtf it means.',
  'Another day, another study confirming what many of us in healthcare already know: when private equity takes over physician practices, patient care suffers, clinician morale plummets, and turnover skyrockets.

The latest research highlights how physician turnover jumps significantly after PE acquisition. The reason? Short-term financial gains are prioritized over long-term sustainability, leading to cost-cutting measures, unrealistic productivity demands, and a loss of autonomy for clinicians.

At Meroka, we are on a mission to protect independent physician practices from the pitfalls of consolidation. Physicians deserve better. Patients deserve better. Healthcare should be led by those who practice it, not those who profit from it.',
  'Alex is Meroka''s CEO and Founder. Former CPA with deep healthcare finance expertise. Building Meroka to protect independent physician practices from PE consolidation. Direct, contrarian thinker who challenges conventional wisdom. Believes healthcare should be led by those who practice it, not those who profit from it.',
  false
),

-- Félix Gagné - Product / Project Manager
(
  'felix.gagne@meroka.com',
  'En cette journée de la santé mentale, j''aimerais faire un rappel bienveillant du haut de mes 26 ans:
Ne soyons pas trop durs envers nous-même.

Beaucoup de choses restent incomprises par rapport à la santé mentale et chaque personne est différente. Alors c''est tout à fait normal de vivre des difficultés et de ne pas savoir comment s''en sortir.

Quand on feel pas, on regarde le monde autour de nous et on ne peut pas comprendre que tout aille aussi bien...

Et pourtant, ça finit toujours par passer.

Ma mère me disait toujours:
La vie fait bien les choses. Tu vas comprendre plus tard.

Soyons doux, pas durs.
Notre "nous" de demain nous en remerciera.

Bonne journée de la santé mentale 💙',
  'La base entrepreneuriale HEC Montréal a été une formidable école d''entrepreneuriat pour moi avec Ludo App. Si vous avez un projet en tête, je vous conseille fortement de considérer La base pour vous accompagner!

Les candidatures sont ouvertes jusqu''à demain! Pour tout savoir',
  'Goal by tomorrow -> Be ready to ship our first CTA experiment.

At the end of the meeting, we should have a clear idea on who is going to work on what so we can ship our 1st experiment ASAP.

Keep in mind that the system is highly imperfect, but the best way to learn is by moving forward & learn as we go. If you have ideas & feedback, please share!',
  'Félix is a Product/Project Manager at Meroka. Born in 1999. Founded a wellness start-up (Ludo App) before joining Meroka. Empathetic, rational and concise communication style. Convinced you can create a lot of impact by applying tech to healthcare. Bilingual (French/English) with strong Montreal startup ecosystem ties.',
  false
),

-- Jean Vianney - CFO
(
  'jeanvianney.cordeiro@meroka.com',
  'Something worth shouting about 🎉

The team at Chichester Festival Theatre continues to do extraordinary work, with six productions either in the West End or touring across the UK ✨

It is inspiring to see the creativity, ambition and craftsmanship from everyone at CFT reaching audiences in London, Chichester and nationwide.

If you have not already, check out the brilliant work the team is delivering across these productions and beyond 🎭👏

At Meroka, restoring humanity in healthcare starts with how we treat each other. That means making time to come together in person, to laugh, to share ideas, and to play.',
  'After 3 wonderful years, I am retiring from the Board at Chichester Festival Theatre 🎭

I have loved working with a smart, kind, and deeply committed Board, alongside an Executive and Management team who genuinely care about getting things right, even when it is not easy.

But the thing I will miss most is the Youth Advisory Board ✨

The YAB brought energy, challenge and optimism. I learned constantly from their honesty, their ambition, and the way they think about culture, access, and a greener tomorrow.

I am leaving grateful, slightly emotional, and very confident about what comes next 🤎',
  'Meroka raises $6M to restore humanity in healthcare 🎉 Featured today in Forbes

Healthcare should be about people ❤️ Yet too often independent physicians are weighed down by paperwork, the burden of admin, and a wave of corporate consolidation. Meroka exists to bring humanity back into healthcare by giving care teams easy-to-use technology and empowering them through employee ownership. This allows them to focus on their patients while also sharing in the benefits of the success they help create.',
  'Jean Vianney is Meroka''s CFO. Background includes board service at Chichester Festival Theatre with focus on youth engagement. Brings a people-first perspective to finance. Believes restoring humanity in healthcare starts with how we treat each other. Values creativity, connection, and coming together in person.',
  false
),

-- Junjian Li - Software Engineer
(
  'junjian.li@meroka.com',
  'Building reliable infrastructure for healthcare isn''t glamorous work. But when a clinic''s systems just work—when physicians can access patient data instantly, when billing flows smoothly, when nothing breaks at 2 AM—that''s when we know we''re doing our job.

At Meroka, we''re building the technical backbone that independent practices need to compete with hospital systems.',
  'The best code is the code you don''t have to think about. Clean architecture, solid testing, predictable deployments. Healthcare software can''t afford to be experimental with uptime.

When a practice depends on your systems to see patients, reliability isn''t a nice-to-have. It''s everything.',
  'AI coding tools are changing how we build software. But the fundamentals matter more than ever—data security, code quality, infrastructure management.

We may move faster with AI assistance, but we still need to think carefully about what we''re building and why.',
  'Junjian is a Software Engineer at Meroka. Focused on infrastructure, reliability, and data security. Pragmatic approach to AI-assisted development—embraces the speed but maintains high standards for code quality. Builds the technical backbone that independent practices depend on.',
  false
),

-- Nigel Albert - Software Engineer
(
  'nigel.albert@meroka.com',
  'Here''s something obvious in retrospect but had not occurred to me: If you have a tool like Sentry that quietly reports errors users encounter, you could set up an AI Agent that automatically fixes bugs as they''re found.

And there''s a natural backend version too—an AI agent that watches your server logs and acts whenever it sees ERROR/CRITICAL/WARNING messages.

The future of software maintenance is proactive, not reactive.',
  'Building video generation features is one of those things that seems simple until you actually do it. The edge cases multiply. The encoding issues appear. The audio sync problems emerge.

But when it works—when you can turn a message into a polished video automatically—the leverage is incredible.',
  'The best engineering decisions often feel boring. Choosing the proven technology over the shiny new thing. Writing comprehensive tests. Documenting your code.

At Meroka, we''re building systems that independent practices will depend on for years. That responsibility shapes every technical choice we make.',
  'Nigel is a Software Engineer at Meroka. Forward-thinking about AI applications in software development and maintenance. Works on video generation and multimedia features. Balances innovation with reliability—excited about what''s possible but grounded in what''s practical.',
  false
)

ON CONFLICT (email) DO UPDATE SET
  example_post_1 = EXCLUDED.example_post_1,
  example_post_2 = EXCLUDED.example_post_2,
  example_post_3 = EXCLUDED.example_post_3,
  blurb = EXCLUDED.blurb,
  is_sample = EXCLUDED.is_sample,
  updated_at = NOW();

Varun
00:00
After she landed, the driver that the clinic had arranged just disappeared, and now she's stuck at the airport waiting for a driver. We get a 2am phone call.
Varun
00:14
In this case, we were monitoring her conversation with the clinic. I forget what exactly was the trigger, but then we're trying to get a hold of the clinic and the driver.
Varun
00:27
We spend about 20 minutes trying to sort that out, can't find the driver, so we just call her an Uber. When she's at the hospital,
Varun
00:38
There are other things we help with as well. Before the procedure, there's a checkup at the hospital to take vitals and make sure the body is in a state to go under the knife. One of the things that made her nervous, and this is where
Varun
01:01
The hospital staff is actually different than the clinic staff. One of the ways these international clinics operate is they don't do the procedures in their own facilities. They have partner hospitals with the full setup. That's actually a feature, not a bug, because if something unrelated happens during surgery, they're already in the hospital. If you're under general anesthesia, you can call in a team immediately instead of being in an isolated clinic. But there's a little more variance with the hospital staff, even if all they're doing is the initial checkup.
Varun
01:39
She noticed that the nurse who did her IV wasn't wearing gloves, which is not something that would be permitted
Varun
01:50
in any American hospital. That made her a bit nervous, so we're following up with the clinic, saying they need to figure out who that nurse is, have that nurse replaced immediately, and now only the clinic staff will be taking care of her.
Varun
02:06
Yeah, all these things come up, and then it's a question like, oh, my mom wants to visit me, or a family member wants to visit me—is there an additional fee for her to stay at the hotel? We've also had other patients ask about general logistical things like, can I use my credit card in Istanbul or do I need to get Turkish lira from a bank before I go? Even things like, once I'm there in Istanbul recovering for a week,
Varun
02:40
on day two or three, I'm pretty much fine and can go out again. What are some things I should do? What are some things I shouldn't do? For example, you probably shouldn't go for a swim—you're not supposed to get your cast wet on your nose.
Varun
02:54
Anyway, I'm just throwing a bunch of examples at you, but this is the scope of things we've had to
Varun
03:04
respond to for our patients.
Varun
03:13
A lot of these tasks aren't necessarily things that need a human. Some we absolutely should and must be involved in, especially anything that veers into higher stakes territory where you want to make sure a human is involved. But if it's just, what are some great places to eat,
Varun
03:36
or based on the pre-op instructions my doctor has given me, what can I do and not do? If you're just referencing those, it's not really medical advice, it's just giving them visibility into what they've been told. Or if it's like,
Varun
03:52
my flight got delayed, can you let my driver know to show up later? The clinic doesn't actually share a lot of these individual details with the patient, so we still act as the control center for this. That's essentially the shape of
Varun
04:09
the problem I'd like you to think about: how can we create
Varun
04:19
an agent you can interact with through text? When someone's abroad, we have this group chat with our concierge team, but can we also add
Varun
04:28
an AI agent into it? If someone asks a low-severity question at 3 a.m., we don't have to wake up and do it. If we do need to wake up, there's an escalation path. We're not asking you to build the full production-ready thing, but
Varun
04:47
is there some kind of MVP you can show where you have this agent, some data sources, and can show conversationally some of the cases it's able to handle? If you have other ideas on what it should or shouldn't handle, or what the remit of the product should be, definitely think about that. I would say
Varun
05:14
from a building perspective, it's okay for this to be more of a scrappy, lightweight, coded thing. I can give some
Varun
05:27
It's actually pretty easy to set up the text message interaction if you have a MacBook. I can give a few tips on that, but Claude will also just figure that out for you.
Varun
05:41
But I think where I'd be interested in seeing your thoughts is on the product dimensions, the interaction, the experience—what it should or shouldn't do, and how you think through all of that.
Varun
05:56
So I'll pause there. We'll obviously have more than just this conversation over the two days, but I just want to introduce the scope first.
Razi
06:07
I think this makes a lot of sense. I think it's pretty fun. Especially in the last few days, you have the Vercel stuff they released, the EV stuff, and then you had Photon Codes. I don't know if you saw their launch, but
Varun
06:20
I don't have to.
Razi
06:23
You can add AI bots into group chats, and right now it's just SMS, but they're looking to enable WhatsApp as well.
Razi
06:33
I have a lot of questions. I don't know if you can structure this, but there are assumptions I can decide on right now. Most of these patients, because they're American, might be using iMessage instead of WhatsApp or other integrations—probably not Telegram.
Razi
06:51
Maybe, I don't know, but those are just assumptions and that would dictate
Varun
06:59
Yeah, definitely. What I would say is, whatever questions you have, I'll answer. You'll probably have more as you're building this.
Razi
07:07
Yeah.
Varun
07:09
For me, I would just
Varun
07:16
make the assumptions you feel are reasonable. The only thing I'd ask is to have a reason for why you made the assumption, so if I ask about it, you can explain your thinking.
Razi
07:19
Just like
Varun
07:24
Yeah, obviously I've been thinking about this for a year versus your
Razi
07:24
Makes sense.
Razi
07:28
Yeah.
Varun
07:29
about the company.
Razi
07:30
So this would be two days. How much access to real world data would I have from
Razi
07:40
information or how you've handed off things in the past or what sort of queries you might have encountered? I've written down the examples you've given.
Razi
07:51
I can generate my own fake docs, I guess. But if this is something that could possibly be used in the future, it would be cool if I could build something for you guys too.
Razi
08:03
How are you going to think about that?
Varun
08:06
Those questions I gave are a good starting point. I have another meeting after this, but after that I'll try to drop some more examples in the chat. I'll also add one of our concierge team members in there as well who will probably do a better job of actually giving more concrete examples.
Varun
08:31
You'd be building this zero to one. I can give you any kind of API key you want for Claude or Codex. We'll share those with whatever you need. As far as the data goes, that's a good question. I'll just drop right now an example itinerary.
Varun
09:01
Yesterday actually as I was thinking through some stuff, so I'll just drop all those resources here.
Varun
09:09
I think it's a good question on what does this agent actually have, what context, what data does it have. It's the right question to ask.
Varun
09:21
We know the patient's full itinerary from the date and times they arrive, when they should be at the clinic, when they should be at the hospital, when they should have their follow-up appointment, and so on. We also have their pre-op instructions.
Concierge Team Member
09:37
Post-op instructions we could get, but those are more personalized because it depends on what exactly happened for that patient during the surgery.
Concierge Team Member
09:50
There's some generic guidance that applies to everyone, but then specific guidance.
Varun
09:54
We haven't yet figured out with our doctor, who just gives them that packet after the surgery. We haven't yet figured out how to put that in our app in the best way, so that's the one nuance I'd say with that. But yeah, we have their itinerary, we have their pre-op instructions, and we also have all their past conversations with the clinic. That can be helpful for various reasons as well.
Concierge Team Member
10:22
And so if it's like...
Concierge Team Member
10:25
I'm trying to think of a concrete example off the top of my head when we had to look back at their past conversations.
Varun
10:39
Maybe for one of the patients more recently who wanted to have their parent come visit them mid-surgery, that could be something where it's relevant.
Concierge Team Member
10:57
I actually can't come up with a great example off the top of my head, but I guess I'll just say that is context.
Varun
11:06
I'm trying to think live of how or where exactly that's valuable, but it's been different for different people.
Varun
11:23
A super random thought is, maybe it's slightly biased by my own life, but if someone for whatever reason has communicated some dietary restriction in the past and they're later asking about great places to eat, maybe you take that into account. Stuff like that.
Razi
11:41
Makes sense. Somewhat of personalization, of course. The other question that I did have is how...
Razi
11:48
Regulation considerate do you want this kind of prototype to be? I know you'll probably be interfacing with hospitals or clinics, maybe in Mexico or Turkey, that might have different requirements and needs. Even the glove thing you mentioned, it might be a standard or regulation in one country and not in another.
Concierge Team Member
12:05
Totally.
Razi
12:12
And then data privacy, there might be patients themselves that might be comfortable with their information being handled locally, or there might be different needs there. I think there are also company standards of quality you want to maintain, and that dictates how you choose local versus cloud, or where that inference happens, or how that inference is happening, whether it's redacted information.
Varun
12:48
100%.
Varun
12:51
Totally. The benefit is I've already negotiated zero data retention agreements with all our auto providers. The API key I gave you will handle that.
Varun
13:02
I'd say like 95% of this. I think the only thing I'm not exactly sure of off the top is I know one of the keys is also able to apply that ZDR to web search because I think they probably either negotiated some agreement with Google or are using something like Brave, but otherwise...
Varun
13:27
If you're using generic Google APIs, then obviously Google is going to log whatever you search.
Varun
13:33
I wouldn't worry about it just yet because I would just assume you can trust the API key.
Razi
13:39
Perfect.
Razi
13:41
And the patient data that I'd be working with right now or conjuring up, yeah, okay.
Concierge Team Member
13:46
Exactly.
Varun
13:48
Yeah, and that'll all be notional data. What I would do there is I've given you an example itinerary and pre-op.
Varun
14:00
From that, if you want to test with different situations, I would just ask Claude or something to generate additional itineraries or things like that.
Concierge Team Member
14:10
Let me think if there's anything else.
Razi
14:15
Given your current stack and what you might have already used, I can build something around that instead of doing something you might not even have witnessed yourself. Maybe it's not Vue that you're comfortable with or whatever it may be.
Razi
14:32
From a grand stack scale or individual tools instead.
Varun
14:34
Yeah.
Concierge Team Member
14:35
Yeah.
Varun
14:36
Our stack for this is really just iMessage for the most part. As long as you have a MacBook, you can just run the AI locally on that and have it respond through your own phone number the way I do.
Varun
14:52
The way we test this internally is we use this app called Burner, which basically gives you another virtual phone number.
Varun
15:03
Yeah, it's like a VOIP. You can text your own phone number. You have this thing running locally that then responds from your phone number back to yourself. So you can essentially just text.
Varun
15:12
I think Burner, I'm assuming you don't already have it installed. It costs about 10 bucks to get another phone number. Feel free to do that and I'll owe you back for whatever that cost is to set it up. That's how I'd recommend testing this.
Razi
15:29
Awesome.
Razi
15:34
Sort of stack. Data privacy.
Razi
15:37
Odd use cases.
Razi
15:40
Is there a certain type of ICP that you folks have identified as the one that you're trying to target? Initially focused on the beachhead, I know you mentioned cosmetic surgery, so I can focus on certain cosmetic use cases and the types of patients that would be possibly going and just look at general stats, but maybe it's something else that you've identified to be clicking. Is there some insight there that you want me to think about?
Razi
16:11
Oh, yeah.
Concierge Team Member
16:12
Great question. I think I would mostly just focus on rhinoplasty patients for now.
Varun
16:16
The other big procedure we do is hair transplants, but those are...
Varun
16:23
I mean they're technically invasive but there's no real limitation on what you could do. Your head is going to look a bit red and sore, but that's kind of all.
Razi
16:35
Have you been to Turkey?
Varun
16:37
I have not yet personally. Cole was the one who visited all the clinics there.
Razi
16:42
Oh yeah, okay, so you've been boots on the ground there, that's fine. When you're in Turkey and you're at the airport, you'll find
Concierge Team Member
16:44
Yeah, of course.
Razi
16:51
full flights and waiting areas full of red dots and stuff. It's very interesting. I love Turkey though.
Concierge Team Member
17:00
Have you been a few times? Sounds like it.
Razi
17:02
I've been a few times. I speak Turkish now, which is nice.
Concierge Team Member
17:06
Well, okay.
Razi
17:06
So, yeah.
Concierge Team Member
17:09
Yeah, I'd really like to go. As we onboard the next set of clinics, right now it's mostly Mexico.
Varun
17:17
I'm hoping to keep onboarding more Turkey clinics just so I have a reason to go.
Razi
17:23
I speak Spanish too, so if you want to work there.
Concierge Team Member
17:27
Double threat. Love it.
Varun
17:35
That's kind of the target thing. The other thing that I think would be beneficial is you can imagine from an actual deployment perspective.
Varun
17:48
We would all feel a bit nervous, like having limited visibility into what the AI is doing. I'm first focused on actually building the agent, but then what is that single pane of glass to just understand—
Razi
17:56
I know.
Varun
18:05
Okay, this is what all my agents are doing for all my patients. Is there any type of trip wire where it's like, "Oh, that conversation looks strange, we should go and see what's happening there." At scale you potentially have to worry about token cost and optimization. For now, I wouldn't worry about that, just feel free to
Varun
18:28
just do what feels right to solve the problem, even if it could be optimized.
Razi
18:33
Do I have a budget here?
Concierge Team Member
18:35
No.
Razi
18:37
Okay. I can always be a little bit more constrained on that side too, even knowing there is unlimited budget, but that dictates how you think about the solutions as well and what you choose to do.
Varun
18:50
Exactly.
Razi
18:53
I think that's enough information I need for now to get started and think about it further. If I have questions, I'll reach out to you.
Varun
19:04
Okay, sounds good. You have Slack. I'll also get some time for us later today.
Concierge Team Member
19:11
Circle up as well.
Varun
19:13
Right now after four looks pretty open to me. Is there any time that you prefer on your end?
Razi
19:21
Three to 4:45-ish, I'd be back around five on, if that's not too late.
Varun
19:29
Yeah, no, it's totally fine. Whatever works for you. Should we do six or what do you think feels good?
Razi
19:35
I like that. Six is good. Do you guys have an office space?
Concierge Team Member
19:37
Okay, cool.
Varun
19:40
We do. I'm calling from there right now. It's our own office in Soho.
Razi
19:47
That's—
Concierge Team Member
19:48
All right.
Razi
19:50
How many people usually end up at the office? Is it hybrid? What's the expectation there?
Concierge Team Member
19:50
It's less.
Varun
19:55
Oh, yeah, we're in person five days a week.
Razi
19:59
Nice. Beautiful.
Varun
19:59
Yeah, I'm normally also in on weekends, given our stage, but everyone's in the office every day.
Razi
20:08
Nuts.
Razi
20:10
Cool. Awesome.
Varun
20:12
Awesome, man. I'm just shooting over an invite.
Concierge Team Member
20:15
Later today, the other thing is let me—
Razi
20:19
API creds and stuff.
Varun
20:20
Yeah, API. Do you have a preference? I'm assuming you're also going to be using AI to code as well. Do you have a preference between Claude and—
Razi
20:21
Or keys?
Razi
20:30
I use Codex and Cursor personally, and then Anti-Gravity for some things, which is a personal
Razi
20:38
weirdness that I want to get out of because I do like Gemini models for some specific areas.
Concierge Team Member
20:44
Amen.
Concierge Team Member
20:46
Okay, let me get you a Codex API key then.
Razi
20:49
Yeah, I have my Cursor so I can leverage that. I have Codex too, but APIQ would be nice.
Concierge Team Member
20:52
Fire.
Varun
20:55
Definitely.
Razi
20:56
Their rate limits are annoying.
Concierge Team Member
20:59
Yeah.
Concierge Team Member
21:12
Cool. Okay. Let me just send you a link to this.
Concierge Team Member
21:20
We use Bitwarden to send secrets, but you don't need an account to view it.
Razi
21:26
Yeah.
Concierge Team Member
21:39
Just putting your email here.
Concierge Team Member
21:44
Shit.
Concierge Team Member
21:52
All right, we can just drop it in the—
Concierge Team Member
21:56
chat here. Oh, thank you. I just saw your message.
Varun
22:00
Cool. Let me also add, Ryan's already in there. Ryan, who's also in the Slack channel, is one of the folks on our concierge team. He's our chief of staff but is also involved in all the patient convos. I'll ask him to drop some
Concierge Team Member
22:21
example questions from patients in the
Varun
22:25
Slack channel, but also don't feel shy about tagging anyone. We just want to make sure you're not blocked or waiting for us on anything.
Razi
22:30
Perfect.
Razi
22:35
Cool.
Concierge Team Member
22:36
Cool, man.
Razi
22:39
Sorry, I was just stalking the people on the Slack. Yeah, exactly.
Concierge Team Member
22:47
Yeah, let me know if you need anything. Like I said, don't be shy about tagging anyone. Make sure we're not blocking you and looking forward to seeing what you come up with.
Razi
22:56
Awesome. Thank you, man.
Concierge Team Member
22:57
Awesome. Thanks for asking. See ya.

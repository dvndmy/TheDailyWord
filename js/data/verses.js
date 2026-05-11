const VERSES_BASE = [
    {
        id: 'genesis-1-1',
        book: 'Genesis',
        bookId: 'genesis',
        reference: 'Genesis 1:1',
        text: 'In the beginning when God created the heavens and the earth,',
        difficulty: 'easy',
        themes: ['creation', 'beginnings'],
        clue: 'Opening words of Scripture.'
    },
    {
        id: 'exodus-14-14',
        book: 'Exodus',
        bookId: 'exodus',
        reference: 'Exodus 14:14',
        text: 'The Lord will fight for you, and you have only to keep still.',
        difficulty: 'easy',
        themes: ['deliverance', 'trust'],
        clue: 'A moment of rescue and waiting.'
    },
    {
        id: 'leviticus-19-18',
        book: 'Leviticus',
        bookId: 'leviticus',
        reference: 'Leviticus 19:18',
        text: 'but you shall love your neighbor as yourself: I am the Lord.',
        difficulty: 'medium',
        themes: ['law', 'love', 'holiness'],
        clue: 'A command later repeated by Jesus.'
    },
    {
        id: 'job-19-25',
        book: 'Job',
        bookId: 'job',
        reference: 'Job 19:25',
        text: 'For I know that my Redeemer lives, and that at the last he will stand upon the earth;',
        difficulty: 'medium',
        themes: ['suffering', 'hope', 'redemption'],
        clue: 'A declaration of hope in the middle of suffering.'
    },
    {
        id: 'psalm-23-1',
        book: 'Psalms',
        bookId: 'psalms',
        reference: 'Psalm 23:1',
        text: 'The Lord is my shepherd, I shall not want.',
        difficulty: 'easy',
        themes: ['trust', 'shepherd', 'provision'],
        clue: 'One of the best-known lines in the Bible.'
    },
    {
        id: 'proverbs-3-5',
        book: 'Proverbs',
        bookId: 'proverbs',
        reference: 'Proverbs 3:5',
        text: 'Trust in the Lord with all your heart, and do not rely on your own insight.',
        difficulty: 'easy',
        themes: ['wisdom', 'trust'],
        clue: 'A wisdom verse about depending on God rather than self.'
    },
    {
        id: 'ecclesiastes-3-1',
        book: 'Ecclesiastes',
        bookId: 'ecclesiastes',
        reference: 'Ecclesiastes 3:1',
        text: 'For everything there is a season, and a time for every matter under heaven:',
        difficulty: 'easy',
        themes: ['time', 'seasons', 'wisdom'],
        clue: 'A famous reflection on timing and human life.'
    },
    {
        id: 'song-of-songs-2-1',
        book: 'Song of Solomon',
        bookId: 'song-of-solomon',
        reference: 'Song of Songs 2:1',
        text: 'I am a rose of Sharon, a lily of the valleys.',
        difficulty: 'hard',
        themes: ['love', 'poetry', 'beauty'],
        clue: 'A poetic line from a lyrical wisdom book.'
    },
    {
        id: 'wisdom-3-1',
        book: 'Wisdom',
        bookId: 'wisdom',
        reference: 'Wisdom 3:1',
        text: 'But the souls of the righteous are in the hand of God, and no torment will ever touch them.',
        difficulty: 'medium',
        themes: ['righteousness', 'hope', 'eternal-life'],
        clue: 'A deuterocanonical wisdom passage about the righteous.'
    },
    {
        id: 'sirach-2-1',
        book: 'Sirach',
        bookId: 'sirach',
        reference: 'Sirach 2:1',
        text: 'My child, when you come to serve the Lord, prepare yourself for testing.',
        difficulty: 'medium',
        themes: ['testing', 'discipleship', 'wisdom'],
        clue: 'A wisdom warning about trials in serving God.'
    },
    {
        id: 'isaiah-40-31',
        book: 'Isaiah',
        bookId: 'isaiah',
        reference: 'Isaiah 40:31',
        text: 'but those who wait for the Lord shall renew their strength, they shall mount up with wings like eagles, they shall run and not be weary, they shall walk and not faint.',
        difficulty: 'easy',
        themes: ['hope', 'strength', 'prophecy'],
        clue: 'A prophetic promise about renewed strength.'
    },
    {
        id: 'jeremiah-29-11',
        book: 'Jeremiah',
        bookId: 'jeremiah',
        reference: 'Jeremiah 29:11',
        text: 'For surely I know the plans I have for you, says the Lord, plans for your welfare and not for harm, to give you a future with hope.',
        difficulty: 'easy',
        themes: ['hope', 'future', 'promise'],
        clue: 'A widely quoted promise about hope and future.'
    },
    {
        id: 'lamentations-3-22-23',
        book: 'Lamentations',
        bookId: 'lamentations',
        reference: 'Lamentations 3:22-23',
        text: 'The steadfast love of the Lord never ceases, his mercies never come to an end; they are new every morning; great is your faithfulness.',
        difficulty: 'medium',
        themes: ['mercy', 'faithfulness', 'hope'],
        clue: 'A poetic line often quoted in worship.'
    },
    {
        id: 'baruch-4-28',
        book: 'Baruch',
        bookId: 'baruch',
        reference: 'Baruch 4:28',
        text: 'For just as you were disposed to go astray from God, return with tenfold zeal to seek him.',
        difficulty: 'hard',
        themes: ['repentance', 'return', 'zeal'],
        clue: 'A deuterocanonical call to return to God.'
    },
    {
        id: 'ezekiel-36-26',
        book: 'Ezekiel',
        bookId: 'ezekiel',
        reference: 'Ezekiel 36:26',
        text: 'A new heart I will give you, and a new spirit I will put within you; and I will remove from your body the heart of stone and give you a heart of flesh.',
        difficulty: 'easy',
        themes: ['renewal', 'heart', 'spirit'],
        clue: 'A prophetic promise of inner transformation.'
    },
    {
        id: 'daniel-3-17',
        book: 'Daniel',
        bookId: 'daniel',
        reference: 'Daniel 3:17',
        text: 'If our God whom we serve is able to deliver us from the furnace of blazing fire and out of your hand, O king, let him deliver us.',
        difficulty: 'medium',
        themes: ['faith', 'deliverance', 'courage'],
        clue: 'A declaration made before a fiery trial.'
    },
    {
        id: 'hosea-6-6',
        book: 'Hosea',
        bookId: 'hosea',
        reference: 'Hosea 6:6',
        text: 'For I desire steadfast love and not sacrifice, the knowledge of God rather than burnt offerings.',
        difficulty: 'medium',
        themes: ['mercy', 'worship', 'prophecy'],
        clue: 'A prophetic rebuke about what God truly desires.'
    },
    {
        id: 'joel-3-1',
        book: 'Joel',
        bookId: 'joel',
        reference: 'Joel 3:1',
        text: 'Then afterward I will pour out my spirit on all flesh; your sons and your daughters shall prophesy, your old men shall dream dreams, and your young men shall see visions.',
        difficulty: 'medium',
        themes: ['spirit', 'prophecy', 'promise'],
        clue: 'A prophecy later echoed in Acts.'
    },
    {
        id: 'amos-5-24',
        book: 'Amos',
        bookId: 'amos',
        reference: 'Amos 5:24',
        text: 'But let justice roll down like waters, and righteousness like an ever-flowing stream.',
        difficulty: 'easy',
        themes: ['justice', 'righteousness', 'prophecy'],
        clue: 'A prophetic call for justice.'
    },
    {
        id: 'obadiah-1-15',
        book: 'Obadiah',
        bookId: 'obadiah',
        reference: 'Obadiah 1:15',
        text: 'For the day of the Lord is near against all the nations. As you have done, it shall be done to you; your deeds shall return on your own head.',
        difficulty: 'hard',
        themes: ['judgment', 'day-of-the-lord'],
        clue: 'A short prophetic book about judgment.'
    },
    {
        id: 'jonah-2-3',
        book: 'Jonah',
        bookId: 'jonah',
        reference: 'Jonah 2:3',
        text: 'The waters closed over me to take my life; the deep surrounded me; weeds were wrapped around my head.',
        difficulty: 'medium',
        themes: ['distress', 'prayer', 'deliverance'],
        clue: 'A prayer from beneath the waters.'
    },
    {
        id: 'micah-6-11-13',
        book: 'Micah',
        bookId: 'micah',
        reference: 'Micah 6:11-13',
        text: 'Can I tolerate wicked scales and a bag of deceitful weights? Because your wealthy are full of violence and your inhabitants speak lies, with tongues of deceit in their mouths, therefore I have begun to strike you down, making you desolate because of your sins.',
        difficulty: 'hard',
        themes: ['justice', 'judgment', 'dishonesty'],
        clue: 'A prophetic condemnation of dishonest scales.'
    },
    {
        id: 'nahum-1-7',
        book: 'Nahum',
        bookId: 'nahum',
        reference: 'Nahum 1:7',
        text: 'The Lord is good, a stronghold in a day of trouble; he protects those who take refuge in him,',
        difficulty: 'medium',
        themes: ['refuge', 'goodness', 'trust'],
        clue: 'A short prophetic comfort verse.'
    },
    {
        id: 'habakkuk-2-4',
        book: 'Habakkuk',
        bookId: 'habakkuk',
        reference: 'Habakkuk 2:4',
        text: 'Look at the proud! Their spirit is not right in them, but the righteous live by their faithfulness.',
        difficulty: 'medium',
        themes: ['faith', 'righteousness', 'prophecy'],
        clue: 'A line often discussed in relation to faith.'
    },
    {
        id: 'zephaniah-3-17',
        book: 'Zephaniah',
        bookId: 'zephaniah',
        reference: 'Zephaniah 3:17',
        text: 'The Lord, your God, is in your midst, a warrior who gives victory; he will rejoice over you with gladness, he will renew you in his love; he will exult over you with loud singing.',
        difficulty: 'medium',
        themes: ['presence', 'joy', 'salvation'],
        clue: 'A prophetic promise of God rejoicing over his people.'
    },
    {
        id: 'haggai-1-5',
        book: 'Haggai',
        bookId: 'haggai',
        reference: 'Haggai 1:5',
        text: 'Now therefore thus says the Lord of hosts: Consider how you have fared.',
        difficulty: 'hard',
        themes: ['reflection', 'obedience', 'prophecy'],
        clue: 'A very short prophetic wake-up call.'
    },
    {
        id: 'zechariah-4-6',
        book: 'Zechariah',
        bookId: 'zechariah',
        reference: 'Zechariah 4:6',
        text: 'He said to me, “This is the word of the Lord to Zerubbabel: Not by might, nor by power, but by my spirit, says the Lord of hosts.”',
        difficulty: 'easy',
        themes: ['spirit', 'power', 'prophecy'],
        clue: 'A prophetic line about strength by the Spirit.'
    },
    {
        id: 'malachi-3-10',
        book: 'Malachi',
        bookId: 'malachi',
        reference: 'Malachi 3:10',
        text: 'Bring the full tithe into the storehouse, so that there may be food in my house, and thus put me to the test, says the Lord of hosts; see if I will not open the windows of heaven for you and pour down for you an overflowing blessing.',
        difficulty: 'medium',
        themes: ['giving', 'blessing', 'obedience'],
        clue: 'A prophetic challenge tied to the tithe.'
    },
    {
        id: 'matthew-5-14',
        book: 'Matthew',
        bookId: 'matthew',
        reference: 'Matthew 5:14',
        text: 'You are the light of the world. A city built on a hill cannot be hid.',
        difficulty: 'easy',
        themes: ['discipleship', 'light', 'sermon-on-the-mount'],
        clue: 'A saying from Jesus in a famous sermon.'
    },
    {
        id: 'mark-10-27',
        book: 'Mark',
        bookId: 'mark',
        reference: 'Mark 10:27',
        text: 'Jesus looked at them and said, “For mortals it is impossible, but not for God; for God all things are possible.”',
        difficulty: 'easy',
        themes: ['faith', 'possibility', 'jesus'],
        clue: 'A Gospel saying about what is possible with God.'
    },
    {
        id: 'luke-1-37',
        book: 'Luke',
        bookId: 'luke',
        reference: 'Luke 1:37',
        text: 'For nothing will be impossible with God.',
        difficulty: 'easy',
        themes: ['faith', 'angelic-message', 'possibility'],
        clue: 'A short Gospel promise tied to the infancy narrative.'
    },
    {
        id: 'john-14-6',
        book: 'John',
        bookId: 'john',
        reference: 'John 14:6',
        text: 'Jesus said to him, “I am the way, and the truth, and the life. No one comes to the Father except through me.”',
        difficulty: 'easy',
        themes: ['jesus', 'identity', 'salvation'],
        clue: 'An “I am” saying from the Fourth Gospel.'
    },
    {
        id: 'acts-1-8',
        book: 'Acts',
        bookId: 'acts',
        reference: 'Acts 1:8',
        text: 'But you will receive power when the Holy Spirit has come upon you; and you will be my witnesses in Jerusalem, in all Judea and Samaria, and to the ends of the earth.',
        difficulty: 'easy',
        themes: ['holy-spirit', 'mission', 'witness'],
        clue: 'A programmatic verse for the early Church.'
    },
    {
        id: 'romans-8-28',
        book: 'Romans',
        bookId: 'romans',
        reference: 'Romans 8:28',
        text: 'We know that all things work together for good for those who love God, who are called according to his purpose.',
        difficulty: 'easy',
        themes: ['providence', 'hope', 'calling'],
        clue: 'A famous Pauline line about God working for good.'
    },
    {
        id: '1-corinthians-13-13',
        book: '1 Corinthians',
        bookId: '1-corinthians',
        reference: '1 Corinthians 13:13',
        text: 'And now faith, hope, and love abide, these three; and the greatest of these is love.',
        difficulty: 'easy',
        themes: ['love', 'faith', 'hope'],
        clue: 'A famous line from the love chapter.'
    },
    {
        id: '2-corinthians-5-7',
        book: '2 Corinthians',
        bookId: '2-corinthians',
        reference: '2 Corinthians 5:7',
        text: 'for we walk by faith, not by sight.',
        difficulty: 'easy',
        themes: ['faith', 'trust'],
        clue: 'A short Pauline contrast between faith and sight.'
    },
    {
        id: 'galatians-5-22-23',
        book: 'Galatians',
        bookId: 'galatians',
        reference: 'Galatians 5:22-23',
        text: 'By contrast, the fruit of the Spirit is love, joy, peace, patience, kindness, generosity, faithfulness, gentleness, and self-control. There is no law against such things.',
        difficulty: 'easy',
        themes: ['holy-spirit', 'virtue', 'fruit'],
        clue: 'A Pauline list of the fruit of the Spirit.'
    },
    {
        id: 'ephesians-2-8',
        book: 'Ephesians',
        bookId: 'ephesians',
        reference: 'Ephesians 2:8',
        text: 'For by grace you have been saved through faith, and this is not your own doing; it is the gift of God—',
        difficulty: 'easy',
        themes: ['grace', 'salvation', 'faith'],
        clue: 'A Pauline line about grace and faith.'
    },
    {
        id: 'philippians-4-13',
        book: 'Philippians',
        bookId: 'philippians',
        reference: 'Philippians 4:13',
        text: 'I can do all things through him who strengthens me.',
        difficulty: 'easy',
        themes: ['strength', 'perseverance', 'christ'],
        clue: 'A famous Pauline statement about strength.'
    },
    {
        id: 'colossians-3-23',
        book: 'Colossians',
        bookId: 'colossians',
        reference: 'Colossians 3:23',
        text: 'Whatever your task, put yourselves into it, as done for the Lord and not for your masters,',
        difficulty: 'medium',
        themes: ['work', 'service', 'discipleship'],
        clue: 'A Pauline instruction about work and motive.'
    },
    {
        id: '1-thessalonians-5-16-18',
        book: '1 Thessalonians',
        bookId: '1-thessalonians',
        reference: '1 Thessalonians 5:16-18',
        text: 'Rejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you.',
        difficulty: 'easy',
        themes: ['prayer', 'joy', 'gratitude'],
        clue: 'A Pauline trio of short exhortations.'
    },
    {
        id: '2-thessalonians-3-3',
        book: '2 Thessalonians',
        bookId: '2-thessalonians',
        reference: '2 Thessalonians 3:3',
        text: 'But the Lord is faithful; he will strengthen you and guard you from the evil one.',
        difficulty: 'medium',
        themes: ['faithfulness', 'protection', 'encouragement'],
        clue: 'A Pauline reassurance about the Lord’s faithfulness.'
    },
    {
        id: '1-timothy-4-12',
        book: '1 Timothy',
        bookId: '1-timothy',
        reference: '1 Timothy 4:12',
        text: 'Let no one despise your youth, but set the believers an example in speech and conduct, in love, in faith, in purity.',
        difficulty: 'easy',
        themes: ['example', 'youth', 'leadership'],
        clue: 'A pastoral encouragement to a younger leader.'
    },
    {
        id: '2-timothy-1-7',
        book: '2 Timothy',
        bookId: '2-timothy',
        reference: '2 Timothy 1:7',
        text: 'for God did not give us a spirit of cowardice, but rather a spirit of power and of love and of self-discipline.',
        difficulty: 'easy',
        themes: ['courage', 'power', 'self-discipline'],
        clue: 'A pastoral line about power, love, and discipline.'
    },
    {
        id: 'titus-2-11',
        book: 'Titus',
        bookId: 'titus',
        reference: 'Titus 2:11',
        text: 'For the grace of God has appeared, bringing salvation to all,',
        difficulty: 'medium',
        themes: ['grace', 'salvation'],
        clue: 'A short pastoral line about grace appearing.'
    },
    {
        id: 'philemon-1-6',
        book: 'Philemon',
        bookId: 'philemon',
        reference: 'Philemon 1:6',
        text: 'I pray that the sharing of your faith may become effective when you perceive all the good that we may do for Christ.',
        difficulty: 'hard',
        themes: ['faith', 'fellowship', 'prayer'],
        clue: 'A short personal letter from Paul.'
    },
    {
        id: 'hebrews-11-1',
        book: 'Hebrews',
        bookId: 'hebrews',
        reference: 'Hebrews 11:1',
        text: 'Now faith is the assurance of things hoped for, the conviction of things not seen.',
        difficulty: 'easy',
        themes: ['faith', 'hope'],
        clue: 'A classic definition of faith.'
    },
    {
        id: 'james-1-5',
        book: 'James',
        bookId: 'james',
        reference: 'James 1:5',
        text: 'If any of you is lacking in wisdom, ask God, who gives to all generously and ungrudgingly, and it will be given you.',
        difficulty: 'easy',
        themes: ['wisdom', 'prayer'],
        clue: 'A general letter encouraging prayer for wisdom.'
    },
    {
        id: '1-peter-5-7',
        book: '1 Peter',
        bookId: '1-peter',
        reference: '1 Peter 5:7',
        text: 'Cast all your anxiety on him, because he cares for you.',
        difficulty: 'easy',
        themes: ['care', 'anxiety', 'trust'],
        clue: 'A general letter about bringing your cares to God.'
    },
    {
        id: '2-peter-3-9',
        book: '2 Peter',
        bookId: '2-peter',
        reference: '2 Peter 3:9',
        text: 'The Lord is not slow about his promise, as some think of slowness, but is patient with you, not wanting any to perish but all to come to repentance.',
        difficulty: 'medium',
        themes: ['patience', 'promise', 'repentance'],
        clue: 'A general letter about the Lord’s patience.'
    },
    {
        id: '1-john-4-19',
        book: '1 John',
        bookId: '1-john',
        reference: '1 John 4:19',
        text: 'We love because he first loved us.',
        difficulty: 'easy',
        themes: ['love', 'identity'],
        clue: 'A very short and memorable line about love.'
    },
    {
        id: '2-john-1-6',
        book: '2 John',
        bookId: '2-john',
        reference: '2 John 1:6',
        text: 'And this is love, that we walk according to his commandments; this is the commandment just as you have heard it from the beginning—you must walk in it.',
        difficulty: 'hard',
        themes: ['love', 'obedience', 'truth'],
        clue: 'A very short letter connecting love and obedience.'
    },
    {
        id: '3-john-1-4',
        book: '3 John',
        bookId: '3-john',
        reference: '3 John 1:4',
        text: 'I have no greater joy than this, to hear that my children are walking in the truth.',
        difficulty: 'hard',
        themes: ['truth', 'joy', 'pastoral-care'],
        clue: 'A very short letter about joy in the truth.'
    },
    {
        id: 'jude-1-24',
        book: 'Jude',
        bookId: 'jude',
        reference: 'Jude 1:24',
        text: 'Now to him who is able to keep you from falling, and to make you stand without blemish in the presence of his glory with rejoicing,',
        difficulty: 'medium',
        themes: ['doxology', 'perseverance', 'glory'],
        clue: 'A closing doxology from a short general letter.'
    },
    {
        id: 'revelation-21-4',
        book: 'Revelation',
        bookId: 'revelation',
        reference: 'Revelation 21:4',
        text: 'he will wipe every tear from their eyes. Death will be no more; mourning and crying and pain will be no more, for the first things have passed away.',
        difficulty: 'easy',
        themes: ['hope', 'new-creation', 'comfort'],
        clue: 'An apocalyptic promise of renewal.'
    }
];

export const verses = VERSES_BASE.map((verse, index) => ({
    ...verse,
    order: index + 1
}));
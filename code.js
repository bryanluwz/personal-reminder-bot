// Secrets, do not see the secrets, pwetty pwease, or I'll be sadge
const SECRETS = {
    BOT_TOKEN: "never gonna give you up",
    PERSONAL_USER_ID: "never gonna let you down",
};

// Other constants
const URLS = {
    TELEGRAM_URL: "https://api.telegram.org/bot" + SECRETS.BOT_TOKEN,
    WEBAPP_URL: "https://nevergonnaturnaroundanddesertyou.com"
};

const SPREADSHEET_INDEX = {
    DATETIME: 0,
    USER_ID: 1,
    REMINDER_PHRASE: 2,
    DONE: 3,
};

const SPREADSHEET_ID = "turi ip ip ip";
const CALENDAR_ID = "tunaktunaktun@group.calendar.google.com";
const REMIND_UPPER_LIMIT = 45;
const REMIND_LOWER_LIMIT = 15;

const DATE_FORMAT_FORMAT = "dd MM yyyy HH:mm:ss Z";
const DATE_PARSE_FORMAT = "dd MM yyyy HH:mm:ss";
const TIMEZONE = 'GMT+8';

const HELP_MESSAGE = "Owner had not implemented any help guide yet >:)";

// Telegram message functions and stuff
function send_message(id, message) {
    var url = URLS.TELEGRAM_URL + "/sendMessage?chat_id=" + id + "&text=" + message;
    var response = UrlFetchApp.fetch(url);
    Logger.log(response.getContentText());
}

function getMe() {
    var url = URLS.TELEGRAM_URL + "/getMe";
    var response = UrlFetchApp.fetch(url);
    Logger.log(response.getContentText());
}

function setWebhook() {
    var url = URLS.TELEGRAM_URL + "/setWebhook?url=" + URLS.WEBAPP_URL;
    var response = UrlFetchApp.fetch(url);
    Logger.log(response.getContentText());
}

// Basic do get and post
function doGet(e) {
    return HtmlService.createHtmlOutput("Hello there");
}

/*
User Input Text Format
 
<command> <other arguments>
 
// User asks for help
/help 
 
// User adds reminder based on datetime provided (yyyy-MM-dd HH:mm 24-hour format)
/add <date> <time> [reminder phrase]
 
// User adds reminder based on time from now (xhym)
/remind <how many hours and minutes> [reminder phrase]  
 
// User removes reminder based on index
/remove <index>
 
// Users asks for info on current reminders
/info 
 
// Users refresh bot
/start
 */


function doPost(e) {
    var contents = JSON.parse(e.postData.contents);
    var text = contents.message.text;
    var id = contents.message.chat.id;
    var name = contents.message.chat.first_name + " " + contents.message.chat.last_name;

    var text_split = text.split(' ');
    var command = text_split[0];

    switch (command) {
        case "/start":
            break;

        case "/help":
            send_message(id, encodeURI(HELP_MESSAGE));
            break;

        case "/info":
            print_reminders_info(id, SPREADSHEET_ID);
            break;

        case "/add":
            // Check if there are any arguments
            if (text_split.length == 1) {
                send_message(id, encodeURI("Please type in the date and time in yyyy-MM-dd HH:mm 24-hour format (｡･∀･)ﾉﾞ\ne.g. 2022-04-20 04:20 for 4:20 am 20th April 2022"));
                break;
            }

            // Is there any reminder phrase ? no : yes
            var reminder_phrase = (text_split.length == 3) ? "" : text_split.slice(3).join(' ');
            var date = text_split[1];
            var time = text_split[2];
            var datetime = new Date(date + " " + time);

            if (datetime == undefined) {
                send_message(id, encodeURI("I'm dumb and I can't understand you timestamp, please write it in yyyy-MM-dd HH:mm 24-hour format pwease.\n(￣y▽,￣)╭ "));
            }
            add_reminders_to_spreadsheet(datetime, id, reminder_phrase, SPREADSHEET_ID);
            break;

        case "/remind":
            // Check if there are any arguments
            if (text_split.length == 1) {
                send_message(id, encodeURI("Please type in a valid time in ?h?m format (ToT) ヾ(•ω•`)o\ne.g. 5h4m for 5 hours and 4 minutes"));
                break;
            }

            // Is there any reminder phrase ? no reminder phrase : got reminder phrase
            var reminder_phrase = (text_split.length == 2) ? "" : text_split.slice(2).join(' ');

            var duration_text = text_split[1];
            var hours = duration_text.match(/(\d+)\s*h/);
            var minutes = duration_text.match(/(\d+)\s*m/);

            if (hours == null && minutes == null) {
                send_message(id, encodeURI("Please type in a valid time in ?h?m format (ToT)"));
            }

            hours = (hours == null) ? 0 : hours[1];
            minutes = (minutes == null) ? 0 : minutes[1];

            add_reminders_to_spreadsheet_by_minutes_and_hours(parseInt(hours), parseInt(minutes), id, reminder_phrase, SPREADSHEET_ID);
            break;

        case "/remove":
            if (text_split.length == 1) {
                send_message(id, encodeURI("Please select one reminder to remove, and type /remove <index> ヾ(•ω•`)o"));
                print_reminders_info(id, SPREADSHEET_ID);
                break;
            }
            else {
                remove_reminders_from_spreadsheet_by_index(id, parseInt(text_split[1]), SPREADSHEET_ID);
            }
            break;

        default:
            send_message(id, encodeURI("(。﹏。*)\nSorry, I don't understand what you meant by: " + text));
            break;
    }
}

// Get events (class) from Google calender and remind me thirty minutes before it starts
// This is assuming that it is not an all-day event
// Triggered about every 30 minute mark, e.g. 1300, 1330, since classes starts on 30-minute interval
function remind_user_before_event(user_id, calender_id) {
    var calendar = CalendarApp.getCalendarById(calender_id);
    var now = new Date();
    var one_hour_from_now = new Date(now.getTime() + (1 * 60 * 60 * 1000));  // hr * min * s * ms

    var events = calendar.getEvents(now, one_hour_from_now);
    events.forEach((event) => {
        var event_start_time = event.getStartTime();
        if (REMIND_LOWER_LIMIT <= (event_start_time.valueOf() - now.valueOf()) / 1000 / 60 && (event_start_time.valueOf() - now.valueOf()) / 1000 / 60 <= REMIND_UPPER_LIMIT) {
            send_message(user_id, event.getTitle());
        }
        Logger.log(event.getTitle());
    });
}

function remind_user_before_event_trigger() {
    // FOR ME BRYAN LU
    remind_user_before_event(SECRETS.PERSONAL_USER_ID, CALENDAR_ID);
}

// Remind users of reminders stored in spreadsheet
// Triggered about every minute (tentatively)
function remind_user_about_reminders(user_id, spreadsheet_id) {
    var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var now = new Date();

    for (var i = 1; i < data.length; i++) {
        if (now.getTime() > data[i][SPREADSHEET_INDEX.DATETIME]) {
            if (data[i][SPREADSHEET_INDEX.USER_ID] == user_id) {
                var message = `Reminder: ${data[i][SPREADSHEET_INDEX.REMINDER_PHRASE]}\n${data[i][SPREADSHEET_INDEX.DATETIME]}`;
                send_message(user_id, encodeURI(message));
                sheet.getRange(i + 1, SPREADSHEET_INDEX.DONE + 1).setValue(true);
            }
        }
    }

    trim_reminders_from_spreadsheet(spreadsheet_id);
}

function remind_user_about_reminders_trigger() {
    remind_user_about_reminders(SECRETS.PERSONAL_USER_ID, SPREADSHEET_ID);
}

function add_reminders_to_spreadsheet(datetime, user_id, reminder_phrase, spreadsheet_id) {
    var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
    var now = new Date();
    datetime.setSeconds(0, 0);
    if (now.valueOf() > datetime.valueOf()) {
        send_message(user_id, encodeURI(`>_< Oh noes it seems like you are trying to set a reminder for the past!\n${datetime}`));
        return;
    }
    sheet.appendRow([datetime, user_id, reminder_phrase, false]);
    var message = `Reminder set sucessfully:\nTitle: ${reminder_phrase}\nDate: ${datetime}`;
    send_message(user_id, encodeURI(message));
}

function add_reminders_to_spreadsheet_by_minutes(minutes, user_id, reminder_phrase, spreadsheet_id) {
    var now = new Date();
    var datetime = new Date(now.getTime() + minutes * 60 * 1000);
    add_reminders_to_spreadsheet(datetime, user_id, reminder_phrase, spreadsheet_id);
}

function add_reminders_to_spreadsheet_by_hours(hours, user_id, reminder_phrase, spreadsheet_id) {
    var now = new Date();
    var datetime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    add_reminders_to_spreadsheet(datetime, user_id, reminder_phrase, spreadsheet_id);
}

function add_reminders_to_spreadsheet_by_minutes_and_hours(hours, minutes, user_id, reminder_phrase, spreadsheet_id) {
    var now = new Date();
    var datetime = new Date(now.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);
    add_reminders_to_spreadsheet(datetime, user_id, reminder_phrase, spreadsheet_id);
}

function trim_reminders_from_spreadsheet(spreadsheet_id) {
    // Remove doned reminders
    var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
    var data = sheet.getDataRange().getValues();

    // Start from the back cause if from front the index will be messed up
    for (var i = data.length - 1; i >= 1; i--) {
        if (data[i][SPREADSHEET_INDEX.DONE] == true) {
            sheet.deleteRow(i + 1);
        }
    }
}

function remove_reminders_from_spreadsheet(datetime, spreadsheet_id) {
    // Remove reminder(s) by datetime given
    // datetime arg is in string format of the DATE_PARSE_FORMAT = "dd MM yyyy HH:mm:ss"
    var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
    var data = sheet.getDataRange().getValues();

    // Start from the back cause if from front the index will be messed up
    for (var i = data.length - 1; i >= 1; i--) {
        Logger.log(data[i][SPREADSHEET_INDEX.DATETIME]);
        if (data[i][SPREADSHEET_INDEX.DATETIME] == datetime) {
            sheet.deleteRow(i + 1);
        }
    }
}

function remove_reminders_from_spreadsheet_by_index(user_id, index, spreadsheet_id) {
    // Index is follow spreadsheet one, use print info to get index
    var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (index > data.length - 1) {
        send_message(user_id, encodeURI(`Reminder of index ${index} does not exists （；´д｀）ゞ`));
        return;
    }
    sheet.deleteRow(index);
    send_message(user_id, encodeURI(`Reminder of index ${index} deleted (✿◡‿◡)`));
}

function print_reminders_info(user_id, spreadsheet_id) {
    // Print info about reminders in spreadsheet
    var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
    var data = sheet.getDataRange().getValues();

    var message = "";

    // Start from the back cause if from front the index will be messed up
    for (var i = 1; i < data.length; i++) {
        message = message + `Reminder ${i}\nTitle: ${data[i][SPREADSHEET_INDEX.REMINDER_PHRASE]}\nDate: ${data[i][SPREADSHEET_INDEX.DATETIME]}`;
        if (i < data.length - 1) {
            message += '\n\n';
        }
    }
    send_message(user_id, encodeURI(message));
}

// Deprecated functions
function setTrigger() {
    ScriptApp.newTrigger("remind_user_before_event_trigger")
        .timeBased()
        .nearMinute(30)
        .everyHours(1) // Frequency is required if you are using atHour() or nearMinute()
        .create();
}

function test() {
    // Insert test here
}

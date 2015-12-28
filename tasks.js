//Tasks.js created by Eugene Mankovski
//https://github.com/emankovski/tasksjs.git
//License: MIT

window.allTasks = [];

function MarkTaskAsCompleted(task) {
    task.status = "Completed";
}

function generateGUID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
}

function TaskObject(callback, name, dependsOnTasks, args) {
    this.callback = callback;
    this.dependsOnTasks = dependsOnTasks;
    this.status = "Created";
    this.result = null;
    this.error = null;
    this.args = args;
    this.taskNumber = -1;
    this.debug = false;
    this.taskFunction = null;
    this.finishedFunction = null;
    this.AddTaskFunction = function (f) {
        this.taskFunction = f;
    }
    this.AddFinishedFunction = function (f) {
        this.finishedFunction = f;
    }
    this.AddDependantTask = function (task) {
        if (this.dependsOnTasks == null) {
            this.dependsOnTasks = [];
        }
        this.dependsOnTasks.push(task);
    }
    this.MarkTaskComplete = function () {
        this.status = "Completed";
    };
    //Use guid is name is not provided
    if (!name) {
        this.name = generateGUID();
    } else {
        this.name = name;
    }
    return this;
}
function ClearTaskArrays() {
    allTasks = new Array();
}

function TaskExists(name) {
    if (allTasks) {
        var len = allTasks.length;
        for (var ii = 0; ii < len; ii++) {
            if (allTasks[ii].name == name) {
                return true;
            }
        }
    }
    return false;
}

function NewTask(callback, depends) {
    var genericTask = new TaskObject(function (name, args, task) {
        try {
            callback();
        }
        catch (e) { }
        finally { task.status = "Completed"; }
    }, "GenericTask", depends, null);
    allTasks.push(genericTask);
    return genericTask;
}

function GetTask(name) {
    if (allTasks) {
        var len = allTasks.length;
        for (var ii = 0; ii < len; ii++) {
            if (allTasks[ii].name == name) {
                return allTasks[ii];
            }
        }
    }
    return null;
}

function WorkerProc() {
    //console.info("Worker alive");
    if (allTasks.length > 0) {
        var postponedTasks = new Array();
        var task = allTasks.pop();
        while (task) {
            //console.info("Task located: " + task.name);
            //Those tasks which are in progress we still consider as active
            if (task.status == "InProgress") {
                postponedTasks.push(task);
                task = allTasks.pop();
                continue;
            }
            //Completed means we can stop listening to them and release
            if (task.status == "Completed") {
                task = allTasks.pop();
                continue;
            }
            if (task.dependsOnTasks) {
                
                var isPosponedTask = false;
                var len = task.dependsOnTasks.length;
                for (var i = 0; i < len; i++) {
                    var dependantTask = task.dependsOnTasks[i];
                    if (allTasks.indexOf(dependantTask) >= 0 || postponedTasks.indexOf(dependantTask) >= 0) {
                        isPosponedTask = true;
                        break;
                    }
                }
                if (isPosponedTask) {
                    //Save this task and continue
                    postponedTasks.push(task);
                    task = allTasks.pop();
                    continue;
                }
            }
            task.status = "InProgress";
            try {
                if (!task.name) {
                    console.error("Task must have name!");
                } else {
                    task.callback(task.name, task.args, task);
                }
            } catch (e) {
                task.status = "Completed";
                task.error = e;
            }
            //We need to come back to this task second time and check if it is completed
            postponedTasks.push(task);
            task = allTasks.pop();
        }
        if (postponedTasks.length > 0) {
            allTasks = allTasks.concat(postponedTasks);
        }
    } else {
        //console.info("No tasks");
    }
}



function WorkerTask(func, error_callback, ok_callback) {

    var localTask = new TaskObject(

    function (name, args, task) {
        //
        var ReportError = function (message) {
            console.error('Worker Task Error was ' + message);

            MarkTaskAsCompleted(task);

            if (error_callback) {
                error_callback(message);
            }
        }

        var ReportOk = function () {
            console.info('Worker Task Completed...');

            MarkTaskAsCompleted(task);

            if (ok_callback) {
                ok_callback();
            }
        }

        try {
            //Actual execution
            func();

        } catch (e) {
            console.error(e);
      
        } finally {
            MarkTaskAsCompleted(task);
        }

    }, "", null, null);

    allTasks.push(localTask);

    return localTask;
}

window.setInterval(WorkerProc, 10);

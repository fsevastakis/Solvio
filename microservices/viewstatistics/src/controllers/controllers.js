import Results from "../models/Results.js";
import axios from "axios";

// number of messages in ProxyQueue, read from the RabbitMQ management HTTP API
const getQueueLength = async () => {
    const url = 'http://rabbitmqquestions:15672/api/queues/%2F/ProxyQueue';
    const auth = {
        username: 'guest',
        password: 'guest'
    }

    try {
        const response = await axios.get(url, { auth });
        console.log(`ProxyQueue length: ${response.data.messages}`);
        return response.data.messages;
    } catch (error) {
        console.error('Error fetching queue length:', error);
        return null;
    }
};

const countAll = async () => {
  try {
    const count = await Results.countDocuments();
    console.log(`Total documents in the Results collection: ${count}`);
    return count; // Return the count to use in getStats
  } catch (error) {
    console.error("Error counting documents:", error);
    throw error;
  }
};

const countTodays = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const count = await Results.countDocuments({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });
    console.log(`Total documents with today's date: ${count}`);
    return count; // Return the count to use in getStats
  } catch (error) {
    console.error("Error counting documents:", error);
    throw error;
  }
};

const findAvgExecTime = async () => {
  try {
    const result = await Results.aggregate([
      {
        $group: {
          _id: null,
          averageExecTime: { $avg: "$execTime" },
        },
      },
    ]);

    const averageExecTime =
      result.length > 0 ? parseFloat(result[0].averageExecTime.toFixed(3)) : 0;
    console.log(`Average execTime: ${averageExecTime}`);
    return averageExecTime; // Return the average to use in getStats
  } catch (error) {
    console.error("Error calculating average execTime:", error);
    throw error;
  }
};

// Problems solved per hour of each day, as a table for the "Daily submissions" chart:
// a header row, then one row per day: [MM-DD, count for 00:00-01:00, ..., count for 23:00-00:00, daily total / 24]
const query1 = async () => {
  try {
    const datagroupby = await Results.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" },
            hour: { $hour: "$date" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
          "_id.hour": 1,
        },
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
          },
          counts: {
            $push: {
              hour: "$_id.hour",
              count: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: "$_id.day",
            },
          },
          counts: 1,
          total: { $sum: "$counts.count" },
          avg: { $divide: [{ $sum: "$counts.count" }, 24] },
        },
      },
    ]);

    const header = [
      "Date",
      "00:00-01:00",
      "01:00-02:00",
      "02:00-03:00",
      "03:00-04:00",
      "04:00-05:00",
      "05:00-06:00",
      "06:00-07:00",
      "07:00-08:00",
      "08:00-09:00",
      "09:00-10:00",
      "10:00-11:00",
      "11:00-12:00",
      "12:00-13:00",
      "13:00-14:00",
      "14:00-15:00",
      "15:00-16:00",
      "16:00-17:00",
      "17:00-18:00",
      "18:00-19:00",
      "19:00-20:00",
      "20:00-21:00",
      "21:00-22:00",
      "22:00-23:00",
      "23:00-00:00",
      "Avg",
    ];

    const datawithAvg = datagroupby.map((result) => {
      const dateStr = result.date
        .toISOString()
        .split("T")[0]
        .split("-")
        .slice(1)
        .join("-");
      const countsArray = Array(24).fill(0);

      result.counts.forEach((item) => {
        countsArray[item.hour] = item.count;
      });

      return [dateStr, ...countsArray, result.avg];
    });
    
    datawithAvg.sort((a, b) => new Date(a[0]) - new Date(b[0]));

    return [header, ...datawithAvg];
  } catch (error) {
    console.error("Error calculating query 1", error);
    throw error;
  }
};

// Execution time of every solved problem, for the execution time histogram
const query2 = async () => {
  try {
    const results = await Results.find();
    return [["problemID", "execTime"], ...results.map((result) => [result.problemID, result.execTime])];
  } catch (error) {
    console.error("Error calculating query 2", error);
    throw error;
  }
};

export const getStats = async (req, res) => {
  try {
    const [totalSubmissions, todaysSubmissions, avgExecTime, queueLen, data1, data2] =
      await Promise.all([
        countAll(),
        countTodays(),
        findAvgExecTime(),
        getQueueLength(),
        query1(),
        query2(),
      ]);

    const data = {
      totalSubmissions,
      todaysSubmissions,
      avgExecTime,
      queueLen,
      data1,
      data2,
    };

    console.log("Data sent to frontend: ", data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in getStats:", error);
    return res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

export const checkHealth = async (req, res) => {
  try {
    return res.status(200).json({ status: "UP" });
  } catch (error) {
    return res.status(500).json({ status: "DOWN" });
  }
};

import express from "express";
import cors from "cors";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

app.post("/analyze", async (req, res) => {
  try {
    const { image } = req.body;

    const response = await axios({
      method: "POST",
      url: "https://detect.roboflow.com/crop-disease-2rilx/4",
      params: { api_key: "5UUeT25poQRore89rnRg" },
      data: image,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
   
    res.json(response.data);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Roboflow API error" });
  }
});

app.listen(5000, () =>
  console.log("backend is running ")
);

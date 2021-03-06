import Video from "./Video";
import Channel from "../remo/Channel";
import Remo from "../remo/Remo";
import * as ffmpeg from 'fluent-ffmpeg';
export default class StaticImage extends Video {


    config: any = {
        input: "static/temporary_fault.gif",
        inputAudio: "static/against_the_clock.mp3",
        resolution: "1920x1080",
        filters: [],
        audioChannels: "1",
        audioCodec: "mp2",
        audioBitrate: "32k",
    };

    static getId(): string{
        return "image";
    }

    start(channel: Channel){
        console.log("Starting Static Image");
        this.startVideoStream(channel);
        if(this.config.inputAudio !== null){
            this.startAudioStream(channel);
        }
    }

    startAudioStream(channel: Channel){
        if(this.audioStream)
            this.audioStream.kill('SIGTERM');
        console.log("Starting audio stream");
        this.audioStream = this.createAudioStream(channel);
        this.audioStream.run();
        this.audioStream.on("start", function(){
            console.log("Starting");
        });
        this.audioStream.on("stderr", function(msg){
            //console.error(msg);
        });
        this.videoStream.on("progress", (progress)=>{
            this.audioData = progress;
        });
        this.audioStream.on("error", function(error){
            console.error(error);
        });
        this.audioStream.on("end", (err)=>{
            console.error("Audio stream died!");
            const now = new Date();
            if(err || this.lastAudioDeath && now.getTime()-this.lastAudioDeath.getTime() < 10000){
                console.error("Audio didn't stay up for 10 seconds ", this.lastAudioDeath, this.lastAudioDeath.getTime()-now.getTime());
                setTimeout(() => this.startAudioStream(channel), 1000*this.retries++, channel);
            }else {
                setTimeout(() => this.startAudioStream(channel), 500, channel);
            }
            this.lastAudioDeath = now;
        })
    }


    startAv(channel: Channel){
        this.startVideoStream(channel);
    }

    createVideoStream(channel: Channel): ffmpeg{
        console.log("Creating video stream");
        let video = ffmpeg(this.config.input)
            .noAudio()
            .fps(25)
            .format("mpegts")
            //.videoFilters(this.config.filters)
            .size(this.config.resolution)
            .videoBitrate("350k")
            .videoCodec("mpeg1video")
            .outputOptions('-bf', '0','-muxdelay','0.001', '-threads', '2');

        if(this.config.input.endsWith(".gif")){
            video = video.inputOptions('-ignore_loop', '0')
        }else{
            video = video.loop();
        }

        return video.output(`http://${Remo.HOST}:1567/transmit?name=${channel.id}-video`);
    }

    createAudioStream(channel: Channel){
        return ffmpeg(this.config.inputAudio)
            .noVideo()
            .inputOptions('-re')
            .format("mpegts")
            .audioCodec(this.config.audioCodec)
            .audioBitrate(this.config.audioBitrate)
            .outputOptions('-muxdelay','0.001')
            .output(`http://${Remo.HOST}:1567/transmit?name=${channel.id}-audio`);
    }

}
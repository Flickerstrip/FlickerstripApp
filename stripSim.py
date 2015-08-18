#!/usr/bin/python

import pyglet;
import socket;
import sys;
import struct;
import errno;
import time;

clientId = "defaultidentifier";
if (sys.argv.__len__() > 1):
    clientId = sys.argv[1];


#start listening for UDP packets
udp_socket= socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp_socket.bind(('',2836))
udp_socket.setblocking(0)
tcp_socket = None;
tcp_connected = False;

def connectTcp(ip,port):
    global tcp_connected, tcp_socket,lastPing;
    if (tcp_connected): return;
    print("connecting",ip,port);
    tcp_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    tcp_socket.connect((ip,port))
    tcp_socket.send("id:"+clientId+"\n\n")
    tcp_socket.setblocking(0);
    lastPing = time.time();
    tcp_connected = True;

def receivedUdpPacket(info):
    data = info[0];
    ip = info[1][0];
    sport = info[1][1];

    data = data.strip("\0");
    parts = data.split("\0");
    if parts[0] == "announce":
        connectTcp(ip,int(parts[1]));

packetTypes = {
        "UNUSED": 0,
        "PING": 1,
        "GET_PATTERNS": 2,
        "CLEAR_PATTERNS": 3,
        "DELETE_PATTERN": 4,
        "SELECT_PATTERN": 5,
        "SAVE_PATTERN": 6,
        "PATTERN_BODY": 7,
        "DISCONNECT_NETWORK": 8,
        "AVAILABLE_BLOCKS": 9
}

packetTypesByNumber = {}
for k in packetTypes:
    packetTypesByNumber[packetTypes[k]] = k;

lastPing = 0;

def receivedTcpPacket(info):
    global packetTypesByNumber, lastPing;
    print("info",info);
    unpacked = struct.unpack('iiii',info[:16]);
    bytesTotal = unpacked[0];
    command = unpacked[1];
    param1 = unpacked[2];
    param2 = unpacked[3];
    cmdName = packetTypesByNumber[command];
    print(cmdName,unpacked);
    if (cmdName == "PING"):
        lastPing = time.time();
        tcp_socket.send("ready\n\n");
        return;

    if (cmdName == "GET_PATTERNS"):
        dummyPattern = "patterns\n0,dummypattern,768,2,2,0,1\n\nready\n\n";
        tcp_socket.send(dummyPattern);
        return;

    if (cmdName == "AVAILABLE_BLOCKS"):
        dummyPattern = "available,1000,4096\n\nready\n\n";
        tcp_socket.send(dummyPattern);
        return;

def tick(dt):
    global tcp_connected, lastPing;
    if (tcp_connected and time.time() - lastPing > 3):
        print("disconnecting due to timeout..");
        tcp_connected = False;
        tcp_socket.close();
    packet = None;
    try:
        packet=udp_socket.recvfrom(1024)
    except:
        pass;
    if (packet):
        receivedUdpPacket(packet);
        return;

    if (tcp_connected):
        packet = None;
        try:
            packet=tcp_socket.recv(2048)
        except socket.error, e:
            if (e.errno == errno.ECONNRESET):
                print("CONNECTION RESET BY PEER");
        if (packet):
            receivedTcpPacket(packet);
            return;

while(True):
    time.sleep(.1);
    tick(.1);

############# GUI STUFF

ledSize = 4;
ledSpace = 2;
ledCount = 150;
padding = 10;
widthNeeded = 2*padding + ledSize*ledCount + ledSpace*(ledCount-1);
window = pyglet.window.Window(widthNeeded,100);

label = pyglet.text.Label('Hello, world',
                          font_name='Times New Roman',
                          font_size=36,
                          x=window.width//2, y=window.height//2,
                          anchor_x='center', anchor_y='center')

def drawRect(x,y,w,h):
    pyglet.graphics.draw(4, pyglet.gl.GL_QUADS,
        ('v2i',[
             x, y,
             x+w, y,
             x+w, y+h,
             x,y+h
        ])
    );

@window.event
def on_draw():
    window.clear();

    x = padding;
    for i in range(ledCount):
        drawRect(x,window.height - padding,ledSize,ledSize);
        x = x + ledSize + ledSpace;

#pyglet.clock.schedule_interval(tick, .1);
#pyglet.app.run();




for i in `cat splashsizes.txt`
do
    W=`echo $i | awk -F'x' '{print $1}'`
    H=`echo $i | awk -F'x' '{print $2}'`
    MAX=$H
    if [[ "$W" -gt "$H" ]]; then
        MAX=$W
    fi
    LOGO_SIZE=$(echo "scale=0;($MAX * 0.5)/1" | bc)
    convert logo_blackgb_rounded_corners.png -resize $LOGO_SIZE temp.png
    SIZE=$W"x"$H
    BORDER=$((($W-$LOGO_SIZE)/2))"x"$((($H-$LOGO_SIZE)/2))
    convert temp.png -bordercolor black -border $BORDER splash$SIZE.png
    echo "Created: splash$SIZE.png"
done

rm temp.png

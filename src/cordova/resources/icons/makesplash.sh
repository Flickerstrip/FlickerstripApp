

cat splashsizes.txt | while read i
do
    TYPE=`echo $i | awk -F' ' '{print $1}'`
    SIZE=`echo $i | awk -F' ' '{print $2}'`
    W=`echo $SIZE | awk -F'x' '{print $1}'`
    H=`echo $SIZE | awk -F'x' '{print $2}'`
    MAX=$H
    if [[ "$W" -gt "$H" ]]; then
        MAX=$W
    fi
    LOGO_SIZE=$(echo "scale=0;($MAX * 0.5)/1" | bc)
    convert logo_blackgb_rounded_corners.png -resize $LOGO_SIZE temp.png
    BORDER=$((($W-$LOGO_SIZE)/2))"x"$((($H-$LOGO_SIZE)/2))
    convert temp.png -bordercolor black -border $BORDER splash$SIZE.png

    if [[ "$TYPE" == "ios" ]]; then
        echo '<splash src="resources/icons/splash'$SIZE'.png" width="'$W'" height="'$H'" />'
    else
        echo '<splash src="resources/icons/splash'$SIZE'.png" density="'$TYPE'" />'
    fi
done

rm temp.png
